"use client";

import "@livekit/components-styles";
import { AudioConference, LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { updateCall } from "@/app/actions/calls";
import { Avatar } from "@/components/Avatar";
import type { CallStatus } from "@/lib/calls";
import { createClient } from "@/lib/supabase/client";
import { primaryButton, secondaryButton } from "@/lib/ui";

const RING_SECONDS = 30;

type Props = {
  callId: string;
  kind: "audio" | "video";
  initialStatus: CallStatus;
  isCaller: boolean;
  isGroup: boolean;
  title: string;
  avatarUrl: string | null;
  chatHref: string;
};

const ENDED_TEXT: Partial<Record<CallStatus, string>> = {
  ended: "Call ended",
  missed: "No answer",
  declined: "Call declined",
};

export function CallRoom({ callId, kind, initialStatus, isCaller, isGroup, title, avatarUrl, chatHref }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<CallStatus>(initialStatus);
  const [conn, setConn] = useState<{ token: string; serverUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finished = status === "ended" || status === "missed" || status === "declined";
  const leaving = useRef(false);
  const connected = useRef(false);

  // Fetch a LiveKit token while the call is live.
  useEffect(() => {
    if (finished) return;
    let cancelled = false;
    fetch(`/api/calls/${callId}/token`, { method: "POST" })
      .then(async (r) => {
        const body = await r.json();
        if (cancelled) return;
        if (!r.ok) setError(body.error ?? "Could not join the call.");
        else setConn(body);
      })
      .catch(() => !cancelled && setError("Could not join the call."));
    return () => {
      cancelled = true;
    };
  }, [callId, finished]);

  // Follow status changes made by the other side.
  useEffect(() => {
    const channel = supabase
      .channel(`call:${callId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` }, (p) =>
        setStatus((p.new as { status: CallStatus }).status),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, callId]);

  // The caller gives up after RING_SECONDS without an answer.
  useEffect(() => {
    if (!isCaller || status !== "ringing") return;
    const t = setTimeout(async () => setStatus((await updateCall(callId, "missed")) ?? "missed"), RING_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [isCaller, status, callId]);

  async function hangUp() {
    if (leaving.current) return;
    leaving.current = true;
    if (status === "ringing" && isCaller) await updateCall(callId, "cancel");
    else if (status === "active" && !isGroup) await updateCall(callId, "end");
    router.push(chatHref);
  }

  if (finished) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <Avatar name={title} url={avatarUrl} size={96} />
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted" role="status">
          {ENDED_TEXT[status]}
        </p>
        <button type="button" onClick={() => router.push(chatHref)} className={primaryButton}>
          Back to chat
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-neutral-950 text-white" data-lk-theme="default">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={title} url={avatarUrl} size={36} />
          <div className="leading-tight">
            <h1 className="font-semibold">{title}</h1>
            <p className="text-sm text-neutral-300" role="status">
              {status === "ringing" ? (isCaller ? "Ringing…" : "Connecting…") : kind === "video" ? "Video call" : "Voice call"}
            </p>
          </div>
        </div>
        <button type="button" onClick={hangUp} className="rounded-full bg-red-700 px-5 py-2 font-semibold text-white hover:bg-red-800">
          {status === "ringing" && isCaller ? "Cancel" : "Hang up"}
        </button>
      </div>
      {error ? (
        <div className="m-auto max-w-sm p-6 text-center">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => router.push(chatHref)} className={`${secondaryButton} mt-4 !text-white`}>
            Back to chat
          </button>
        </div>
      ) : conn ? (
        <LiveKitRoom
          serverUrl={conn.serverUrl}
          token={conn.token}
          connect
          audio
          video={kind === "video"}
          onConnected={() => {
            connected.current = true;
          }}
          onDisconnected={() => {
            // A failed first connection also fires this; only a real disconnect hangs up.
            if (connected.current) void hangUp();
            else setError("Could not connect to the call. Check your connection and try again.");
          }}
          onError={() => setError("Could not connect to the call. Check your connection and try again.")}
          className="flex min-h-[70vh] flex-1 flex-col"
        >
          {kind === "video" ? <VideoConference /> : <AudioConference />}
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <p className="m-auto text-neutral-300" role="status">
          Connecting…
        </p>
      )}
    </main>
  );
}
