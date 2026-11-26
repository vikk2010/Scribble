"use client";

import { useEffect, useId, useRef, useState } from "react";

const CATEGORIES: { name: string; emojis: string[] }[] = [
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😛", "😜", "🤪", "😎", "🤩", "🥳", "😏", "😌", "😴", "🤔", "🤗", "🤭", "😮", "😲", "😢", "😭", "😤", "😡", "🥺", "😱", "🙄", "😬", "🤯", "🫡"] },
  { name: "Gestures", emojis: ["👍", "👎", "👏", "🙌", "🙏", "🤝", "👋", "✌️", "🤞", "👌", "🤙", "💪", "👊", "✊", "🫶", "👀", "🤷", "🙋", "💃", "🕺"] },
  { name: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💕", "💯", "✨", "🔥", "⭐", "🌟", "💥", "🎉", "🎊", "🎁", "🏆"] },
  { name: "Things", emojis: ["☕", "🍕", "🍔", "🍟", "🍦", "🍰", "🍿", "🥭", "🍛", "🍜", "⚽", "🏏", "🏃", "🚴", "🎵", "🎮", "📸", "✈️", "🏖️", "🌧️", "☀️", "🌈", "🐶", "🐱", "🌸", "🌻", "📚", "💻", "📱", "🚀"] },
];

type Props = {
  /** Called with the chosen emoji. */
  onPick: (emoji: string) => void;
  label?: string;
  className?: string;
};

/** A small, keyboard-accessible emoji picker that opens above or below its button. */
export function EmojiPicker({ onPick, label = "Add emoji", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-2 text-muted hover:bg-surface hover:text-brand"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <path d="M9 9h.01M15 9h.01" strokeWidth={3} />
        </svg>
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose an emoji"
          className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-2xl border border-border bg-background p-2 shadow-xl"
        >
          <div role="tablist" aria-label="Emoji categories" className="mb-2 flex gap-1">
            {CATEGORIES.map((c, i) => (
              <button
                key={c.name}
                type="button"
                role="tab"
                aria-selected={tab === i}
                onClick={() => setTab(i)}
                className={`flex-1 rounded-full px-2 py-1 text-xs font-medium ${tab === i ? "bg-surface text-brand" : "text-muted hover:bg-surface"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={CATEGORIES[tab].name} className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto">
            {CATEGORIES[tab].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`Insert ${emoji}`}
                onClick={() => onPick(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl hover:bg-surface"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Inserts text at the caret of an input or textarea and returns the new value. */
export function insertAtCaret(el: HTMLInputElement | HTMLTextAreaElement | null, value: string, insert: string): string {
  if (!el) return value + insert;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + insert + value.slice(end);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + insert.length, start + insert.length);
  });
  return next;
}
