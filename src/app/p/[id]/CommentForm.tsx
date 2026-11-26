"use client";

import { useActionState, useState } from "react";
import { addComment, type CommentFormState } from "@/app/actions/posts";
import { inputClass, primaryButton } from "@/lib/ui";

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<CommentFormState, FormData>(addComment, {});
  const [text, setText] = useState("");
  const [last, setLast] = useState(state.commented);
  if (state.commented !== last) {
    setLast(state.commented);
    setText("");
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={postId} />
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Write a comment</span>
          <input
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            placeholder="Write a comment"
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={pending || !text.trim()} className={`${primaryButton} !py-2`}>
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state.error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{state.error}</p> : null}
    </form>
  );
}
