"use client";

import { useActionState } from "react";
import { createGroupChat, type GroupChatState } from "@/app/actions/friends";
import type { Person } from "@/lib/friends";
import { inputClass, primaryButton } from "@/lib/ui";

export function GroupChatForm({ friends }: { friends: Person[] }) {
  const [state, action, pending] = useActionState<GroupChatState, FormData>(createGroupChat, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Chat name</span>
        <input name="title" required maxLength={50} placeholder="Weekend trip" className={inputClass} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Add friends (at least two)</legend>
        {friends.map((f) => (
          <label key={f.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 has-[:checked]:border-ring-brand has-[:checked]:bg-surface">
            <input type="checkbox" name="members" value={f.id} className="h-4 w-4 accent-[#c2410c]" />
            <span className="font-medium">{f.display_name}</span>
            <span className="text-sm text-muted">@{f.username}</span>
          </label>
        ))}
      </fieldset>
      {state.error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Creating…" : "Start group chat"}
      </button>
    </form>
  );
}
