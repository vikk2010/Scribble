"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { updateCall } from "@/app/actions/calls";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";

type Ringing = { id: string; kind: "audio" | "video"; name: string; avatarUrl: string | null };
type CallRow = { id: string; started_by: string; kind: "audio" | "video"; status: string };

/** Listens for calls to the signed-in user and shows an answer / decline prompt. */
export function IncomingCall({ me }: { me: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [ringing, setRinging] = useState<Ringing | null>(null);
  const acceptRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`incoming-calls:${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, async (p) => {
        const call = p.new as CallRow;
        if (call.started_by === me || call.status !== "ringing") return;
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", call.started_by)
          .maybeSingle<{ display_name: string; avatar_url: string | null }>();
        setRinging({ id: call.id, kind: call.kind, name: data?.display_name ?? "Someone", avatarUrl: data?.avatar_url ?? null });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls" }, (p) => {
        const call = p.new as CallRow;
        if (call.status !== "ringing") setRinging((r) => (r?.id === call.id ? null : r));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, me]);

  useEffect(() => {
    if (ringing) acceptRef.current?.focus();
  }, [ringing]);

  if (!ringing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="incoming-call-title"
        className="w-full max-w-sm rounded-3xl bg-background p-6 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 w-fit animate-pulse rounded-full p-1 bg-brand-gradient">
          <Avatar name={ringing.name} url={ringing.avatarUrl} size={88} className="ring-4 ring-background" />
        </div>
        <h2 id="incoming-call-title" className="text-xl font-semibold">
          {ringing.name}
        </h2>
        <p className="text-muted">Incoming {ringing.kind === "video" ? "video" : "voice"} call</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={async () => {
              const id = ringing.id;
              setRinging(null);
              await updateCall(id, "decline");
            }}
            className="rounded-full bg-red-700 py-3 font-semibold text-white hover:bg-red-800"
          >
            Decline
          </button>
          <button
            ref={acceptRef}
            type="button"
            onClick={async () => {
              const id = ringing.id;
              setRinging(null);
              await updateCall(id, "accept");
              router.push(`/calls/${id}`);
            }}
            className="rounded-full bg-green-700 py-3 font-semibold text-white hover:bg-green-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
