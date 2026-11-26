"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { createPost, type PostFormState } from "@/app/actions/posts";
import { Avatar } from "@/components/Avatar";
import { EmojiPicker, insertAtCaret } from "@/components/EmojiPicker";
import { createClient } from "@/lib/supabase/client";
import { card, primaryButton, secondaryButton } from "@/lib/ui";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from "@/lib/validation";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Media = { kind: "image" | "video"; url: string } | null;
type Props = { userId: string; name: string; avatarUrl: string | null };

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const src = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(src);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(src);
      resolve(Number.NaN);
    };
    el.src = src;
  });
}

export function PostComposer({ userId, name, avatarUrl }: Props) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(createPost, {});
  const [media, setMedia] = useState<Media>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Clear the composer once a post goes through.
  const [lastPosted, setLastPosted] = useState(state.posted);
  if (state.posted !== lastPosted) {
    setLastPosted(state.posted);
    setText("");
    setMedia(null);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);

    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) return setUploadError("Pick a photo or a video.");
    if (!isVideo && file.size > MAX_IMAGE_BYTES) return setUploadError("Photos must be under 10 MB.");
    if (isVideo) {
      if (file.size > MAX_VIDEO_BYTES) return setUploadError("Videos must be under 50 MB.");
      const seconds = await videoDuration(file);
      if (!Number.isFinite(seconds)) return setUploadError("That video can't be played here. Try an MP4.");
      if (seconds > MAX_VIDEO_SECONDS + 0.5) return setUploadError(`Videos can be up to ${MAX_VIDEO_SECONDS} seconds.`);
    }

    setUploading(true);
    const bucket = isVideo ? "post-videos" : "post-images";
    const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError("Upload failed. Please try again.");
    setMedia({ kind: isVideo ? "video" : "image", url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl });
  }

  return (
    <form
      action={action}
      className={`${card} flex flex-col gap-3 p-4 focus-within:border-ring-brand focus-within:ring-2 focus-within:ring-ring-brand/25`}
    >
      <input type="hidden" name="imageUrl" value={media?.kind === "image" ? media.url : ""} />
      <input type="hidden" name="videoUrl" value={media?.kind === "video" ? media.url : ""} />
      <div className="flex gap-3">
        <Avatar name={name} url={avatarUrl} size={40} />
        <label className="flex-1">
          <span className="sr-only">What&apos;s on your mind?</span>
          <textarea
            ref={textRef}
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
      {media ? (
        <div className="relative overflow-hidden rounded-xl bg-surface">
          {media.kind === "image" ? (
            <div className="relative aspect-[4/3] w-full">
              <Image src={media.url} alt="Photo to post" fill sizes="600px" className="object-cover" />
            </div>
          ) : (
            <video src={media.url} controls playsInline className="max-h-80 w-full bg-black" aria-label="Video to post" />
          )}
          <button
            type="button"
            onClick={() => setMedia(null)}
            className="absolute right-2 top-2 rounded-full bg-black/75 px-3 py-1 text-sm text-white"
          >
            Remove
          </button>
        </div>
      ) : null}
      {uploadError || state.error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {uploadError ?? state.error}
        </p>
      ) : null}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className={secondaryButton}>
            {uploading ? "Uploading…" : "Photo or video"}
          </button>
          <EmojiPicker onPick={(e) => setText((t) => insertAtCaret(textRef.current, t, e).slice(0, 500))} />
          <input ref={fileInput} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden onChange={onPickFile} />
          <span className="text-sm text-muted" aria-live="polite">
            {text.length}/500
          </span>
        </div>
        <button type="submit" disabled={pending || uploading || (!text.trim() && !media)} className={primaryButton}>
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      <p className="text-xs text-muted">Videos up to {MAX_VIDEO_SECONDS} seconds. Everything you post is public.</p>
    </form>
  );
}
