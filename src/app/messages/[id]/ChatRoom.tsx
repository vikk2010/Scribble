"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Avatar } from "@/components/Avatar";
import { EmojiPicker, insertAtCaret } from "@/components/EmojiPicker";
import type { Message } from "@/lib/chat";
import type { Person } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";
import { primaryButton } from "@/lib/ui";

type Props = {
  conversationId: string;
  me: string;
  isGroup: boolean;
  members: Person[];
  initialMessages: Message[];
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" });
}

export function ChatRoom({ conversationId, me, isGroup, members, initialMessages }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const bottomRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const addMessage = (m: Message) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  // Live updates: new messages via Postgres changes, typing via broadcast.
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          addMessage(m);
          setTyping((t) => {
            const next = { ...t };
            delete next[m.sender_id];
            return next;
          });
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const from = (payload as { userId?: string }).userId;
        if (from && from !== me) setTyping((t) => ({ ...t, [from]: Date.now() }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, me]);

  // Drop typing indicators after 4 seconds of silence.
  useEffect(() => {
    const timer = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        const entries = Object.entries(t).filter(([, at]) => now - at < 4000);
        return entries.length === Object.keys(t).length ? t : Object.fromEntries(entries);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep the newest message in view and mark the chat as read.
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
    void supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", me);
  }, [lastId, supabase, conversationId, me]);

  function onType(value: string) {
    setText(value);
    const now = Date.now();
    if (value && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: me } });
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: me, body })
      .select("id, body, sender_id, created_at")
      .single<Message>();
    setSending(false);
    if (error || !data) return setError("Message not sent. Please try again.");
    setText("");
    addMessage(data);
  }

  const typingNames = Object.keys(typing)
    .map((id) => byId.get(id)?.display_name.split(" ")[0])
    .filter(Boolean);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col">
      <ol aria-label="Messages" aria-live="polite" className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <li className="m-auto text-center text-muted">No messages yet. Say hello!</li>
        ) : null}
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          const firstOfRun = newDay || !prev || prev.sender_id !== m.sender_id;
          const sender = byId.get(m.sender_id);
          return (
            <li key={m.id} className="flex flex-col">
              {newDay ? (
                <p className="my-3 text-center text-xs font-medium text-muted">{formatDay(m.created_at)}</p>
              ) : null}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${firstOfRun ? "mt-2" : ""}`}>
                {!mine && isGroup ? (
                  firstOfRun ? (
                    <Avatar name={sender?.display_name ?? "?"} url={sender?.avatar_url ?? null} size={28} />
                  ) : (
                    <span className="w-7 shrink-0" />
                  )
                ) : null}
                <div className={`flex max-w-[75%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!mine && isGroup && firstOfRun ? (
                    <span className="mb-0.5 px-3 text-xs font-medium text-muted">{sender?.display_name ?? "Someone"}</span>
                  ) : null}
                  <div
                    className={`whitespace-pre-line break-words rounded-2xl px-3.5 py-2 ${
                      mine ? "rounded-br-md bg-brand-gradient text-white" : "rounded-bl-md bg-surface"
                    }`}
                  >
                    <span className="sr-only">{mine ? "You" : (sender?.display_name ?? "Someone")}: </span>
                    {m.body}
                  </div>
                  <time dateTime={m.created_at} className="mt-0.5 px-1 text-[11px] text-muted">
                    {formatTime(m.created_at)}
                  </time>
                </div>
              </div>
            </li>
          );
        })}
        <li ref={bottomRef} aria-hidden className="h-0" />
      </ol>

      <p className="h-5 text-sm text-muted" aria-live="polite">
        {typingNames.length ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…` : ""}
      </p>
      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      <form onSubmit={send} className="sticky bottom-16 flex gap-2 border-t border-border bg-background py-3 sm:bottom-0">
        <label className="flex-1">
          <span className="sr-only">Type a message</span>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Type a message"
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-2.5 outline-none focus:border-ring-brand focus:ring-2 focus:ring-ring-brand/25 focus-visible:outline-none"
          />
        </label>
        <EmojiPicker className="self-center" onPick={(e) => setText((t) => insertAtCaret(inputRef.current, t, e).slice(0, 2000))} />
        <button type="submit" disabled={sending || !text.trim()} className={`${primaryButton} !py-2`}>
          Send
        </button>
      </form>
    </div>
  );
}
