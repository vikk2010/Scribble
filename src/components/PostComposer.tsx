"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { createPost, type PostFormState } from "@/app/actions/posts";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";
import { card, primaryButton, secondaryButton } from "@/lib/ui";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Props = { userId: string; name: string; avatarUrl: string | null };

export function PostComposer({ userId, name, avatarUrl }: Props) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(createPost, {});
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Clear the composer once a post goes through.
  const [lastPosted, setLastPosted] = useState(state.posted);
  if (state.posted !== lastPosted) {
    setLastPosted(state.posted);
    setText("");
    setImageUrl("");
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) return setUploadError("Pick an image file.");
    if (file.size > MAX_IMAGE_BYTES) return setUploadError("Images must be under 10 MB.");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("post-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError("Upload failed. Please try again.");
    setImageUrl(supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={action} className={`${card} flex flex-col gap-3 p-4 focus-within:border-ring-brand focus-within:ring-2 focus-within:ring-ring-brand/25`}>
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <div className="flex gap-3">
        <Avatar name={name} url={avatarUrl} size={40} />
        <label className="flex-1">
          <span className="sr-only">What&apos;s on your mind?</span>
          <textarea
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={`What's on your mind, ${name.split(" ")[0]}?`}
            className="w-full resize-none bg-transparent text-lg placeholder:text-muted focus-visible:outline-none"
          />
        </label>
      </div>
      {imageUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface">
          <Image src={imageUrl} alt="Photo to post" fill sizes="600px" className="object-cover" />
          <button
            type="button"
            onClick={() => setImageUrl("")}
            className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-sm text-white"
          >
            Remove
          </button>
        </div>
      ) : null}
      {uploadError || state.error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">{uploadError ?? state.error}</p>
      ) : null}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className={secondaryButton}>
            {uploading ? "Uploading…" : "Add photo"}
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPickImage} />
          <span className="text-sm text-muted" aria-live="polite">{text.length}/500</span>
        </div>
        <button type="submit" disabled={pending || uploading || (!text.trim() && !imageUrl)} className={primaryButton}>
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
