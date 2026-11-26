"use client";

import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants } from "@livekit/components-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { leaveSeat, takeSeat } from "@/app/actions/rooms";
import { Avatar } from "@/components/Avatar";
import type { Person } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { primaryButton, secondaryButton } from "@/lib/ui";

const MAX_SPEAKERS = 5;

type Props = {
  groupId: string;
  slug: string;
  me: string;
  isOwner: boolean;
  members: Person[];
  initialSpeakers: string[];
  /** False when LiveKit isn't configured: seats still work, audio doesn't. */
  voiceEnabled: boolean;
};

type Conn = { token: string; serverUrl: string; speaker: boolean };

export function VoiceRoom({ groupId, slug, me, isOwner, members, initialSpeakers, voiceEnabled }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const people = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [speakers, setSpeakers] = useState<string[]>(initialSpeakers);
  const [conn, setConn] = useState<Conn | null>(null);
  const [joining, setJoining] = useState(false);
  const [roomKey, setRoomKey] = useState(0);
  const [speaking, setSpeaking] = useState<Set<string>>(new Set());
  const [inRoom, setInRoom] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const connected = useRef(false);

  const onStage = speakers.includes(me);
  const full = speakers.length >= MAX_SPEAKERS;

  // Keep the seats in sync with everyone else in the group.
  useEffect(() => {
    async function refresh() {
      const { data } = await supabase
        .from("group_room_speakers")
        .select("user_id")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });
      if (data) setSpeakers(data.map((r) => r.user_id as string));
    }
    const channel = supabase
      .channel(`stage:${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_room_speakers", filter: `group_id=eq.${groupId}` }, () =>
        void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, groupId]);

  async function connect() {
    setJoining(true);
    setError(null);
    try {
      const r = await fetch(`/api/groups/${slug}/room-token`, { method: "POST" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? "Could not join the voice room.");
      connected.current = false;
      setConn(body);
      setRoomKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join the voice room.");
    } finally {
      setJoining(false);
    }
  }

  function disconnect() {
    connected.current = false;
    setConn(null);
    setSpeaking(new Set());
    setInRoom(0);
  }

  function sitDown() {
    startTransition(async () => {
      setError(null);
      const res = await takeSeat(groupId);
      if (!res.ok) return setError(res.error);
      setSpeakers((s) => (s.includes(me) ? s : [...s, me]));
      // A new token is needed to publish audio.
      if (conn) await connect();
    });
  }

  function standUp(userId?: string) {
    startTransition(async () => {
      setError(null);
      await leaveSeat(groupId, userId);
      const who = userId ?? me;
      setSpeakers((s) => s.filter((id) => id !== who));
      if (who === me && conn) await connect();
    });
  }

  const listeners = Math.max(0, inRoom - speakers.length);

  return (
    <section aria-labelledby="voice-room" className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="voice-room" className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>🎙️</span> Voice room
            {conn ? (
              <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Live</span>
            ) : null}
          </h2>
          <p className="text-sm text-muted">
            Up to {MAX_SPEAKERS} people talk on stage. Everyone else listens and chats.
          </p>
        </div>
        <p className="text-sm font-medium" role="status">
          {speakers.length}/{MAX_SPEAKERS} seats taken
          {conn ? ` · ${listeners} ${listeners === 1 ? "listener" : "listeners"}` : ""}
        </p>
      </div>

      <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5" aria-label="Stage seats">
        {Array.from({ length: MAX_SPEAKERS }, (_, i) => {
          const id = speakers[i];
          const p = id ? people.get(id) : undefined;
          if (!id) {
            return (
              <li key={`open-${i}`} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-3 text-center">
                <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-xl text-muted">
                  +
                </span>
                <span className="text-xs text-muted">Open seat</span>
              </li>
            );
          }
          const name = p?.display_name ?? "Member";
          const talking = speaking.has(id);
          return (
            <li key={id} className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center">
              <span
                className={`rounded-full p-0.5 transition ${talking ? "bg-brand-gradient shadow-[0_0_0_4px_rgba(234,88,12,0.25)]" : "bg-transparent"}`}
              >
                <span className="block rounded-full bg-background p-0.5">
                  <Avatar name={name} url={p?.avatar_url ?? null} size={52} />
                </span>
              </span>
              <span className="w-full truncate text-xs font-semibold">
                {id === me ? "You" : name}
              </span>
              <span className="text-[11px] text-muted">{talking ? "Speaking" : "On stage"}</span>
              {isOwner && id !== me ? (
                <button
                  type="button"
                  onClick={() => standUp(id)}
                  disabled={pending}
                  className="text-[11px] font-medium text-brand underline-offset-2 hover:underline"
                  aria-label={`Move ${name} off the stage`}
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {voiceEnabled ? (
          conn ? (
            <button type="button" onClick={disconnect} className="rounded-full bg-red-700 px-5 py-2 font-semibold text-white hover:bg-red-800">
              Leave room
            </button>
          ) : (
            <button type="button" onClick={connect} disabled={joining} className={primaryButton}>
              {joining ? "Joining…" : "🎧 Join room"}
            </button>
          )
        ) : null}
        {onStage ? (
          <button type="button" onClick={() => standUp()} disabled={pending} className={secondaryButton}>
            Leave stage
          </button>
        ) : (
          <button type="button" onClick={sitDown} disabled={pending || full} className={voiceEnabled ? secondaryButton : primaryButton}>
            {full ? "Stage is full" : "🎤 Take a seat"}
          </button>
        )}
        {conn ? (
          <LiveKitRoom
            key={roomKey}
            serverUrl={conn.serverUrl}
            token={conn.token}
            connect
            audio={conn.speaker}
            video={false}
            onConnected={() => {
              connected.current = true;
            }}
            onDisconnected={() => {
              if (!connected.current) setError("Could not connect to the voice room. Try again.");
            }}
            onError={() => setError("Could not connect to the voice room. Try again.")}
            className="contents"
          >
            <RoomAudioRenderer />
            <RoomWatcher onSpeaking={setSpeaking} onCount={setInRoom} />
            {conn.speaker ? <MicToggle /> : null}
          </LiveKitRoom>
        ) : null}
      </div>

      {!voiceEnabled ? (
        <p className="mt-4 rounded-2xl bg-surface p-3 text-sm text-muted">
          Live audio isn&apos;t set up on this server yet, so seats work but you won&apos;t hear anyone. Add your LiveKit keys
          to turn on voice. The group chat below works either way.
        </p>
      ) : conn && !conn.speaker ? (
        <p className="mt-4 text-sm text-muted">You&apos;re listening. Take a seat when one is free to talk.</p>
      ) : null}
    </section>
  );
}

/** Reports who is speaking and how many people are in the room. */
function RoomWatcher({ onSpeaking, onCount }: { onSpeaking: (s: Set<string>) => void; onCount: (n: number) => void }) {
  const participants = useParticipants();
  const key = participants
    .filter((p) => p.isSpeaking)
    .map((p) => p.identity)
    .sort()
    .join(",");
  useEffect(() => {
    onSpeaking(new Set(key ? key.split(",") : []));
  }, [key, onSpeaking]);
  useEffect(() => {
    onCount(participants.length);
  }, [participants.length, onCount]);
  return null;
}

function MicToggle() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  return (
    <button
      type="button"
      onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      aria-pressed={!isMicrophoneEnabled}
      className={secondaryButton}
    >
      {isMicrophoneEnabled ? "🔇 Mute" : "🎙️ Unmute"}
    </button>
  );
}
