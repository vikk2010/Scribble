"use client";

import { useActionState } from "react";
import { createGroup, type GroupFormState } from "@/app/actions/groups";
import { TOPIC_KEYS, TOPICS } from "@/lib/topics";
import { inputClass, primaryButton } from "@/lib/ui";

export function GroupForm() {
  const [state, action, pending] = useActionState<GroupFormState, FormData>(createGroup, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Group name</span>
        <input name="name" required minLength={3} maxLength={50} className={inputClass} />
        {err.name ? <span className="text-sm text-red-700 dark:text-red-400">{err.name}</span> : null}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">What is it about?</span>
        <textarea name="description" maxLength={300} rows={3} className={inputClass} />
        {err.description ? <span className="text-sm text-red-700 dark:text-red-400">{err.description}</span> : null}
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Topic</legend>
        <div className="flex flex-wrap gap-2">
          {TOPIC_KEYS.map((k) => (
            <label
              key={k}
              className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm font-medium has-[:checked]:border-ring-brand has-[:checked]:bg-surface has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring-brand"
            >
              <input type="radio" name="topic" value={k} defaultChecked={k === "other"} className="sr-only" />
              <span aria-hidden>{TOPICS[k].emoji}</span> {TOPICS[k].label}
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
