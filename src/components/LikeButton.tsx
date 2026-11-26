"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setLike } from "@/app/actions/posts";

type Props = { postId: string; liked: boolean; count: number; signedIn: boolean };

export function LikeButton({ postId, liked, count, signedIn }: Props) {
  // Local state so the change sticks without reloading the whole feed (which would reshuffle it).
  const [state, setState] = useState({ liked, count });
  const [pending, startTransition] = useTransition();

  const label = `${state.count} ${state.count === 1 ? "like" : "likes"}`;
  const heart = (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill={state.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3.1 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.6 0 5.8 3.7 4.3 7.2C19.5 16.4 12 21 12 21z" />
    </svg>
  );
  const cls = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-surface ${state.liked ? "text-brand" : "text-muted"}`;

  if (!signedIn) {
    return (
      <Link href="/login" className={cls} aria-label={`${label}. Log in to like`}>
        {heart}
        {state.count}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={`${state.liked ? "Unlike" : "Like"}. ${label}`}
      className={cls}
      disabled={pending}
      onClick={() => {
        const previous = state;
        const next = { liked: !state.liked, count: state.count + (state.liked ? -1 : 1) };
        setState(next);
        startTransition(async () => {
          if (!(await setLike(postId, next.liked))) setState(previous);
        });
      }}
    >
      {heart}
      {state.count}
    </button>
  );
}
