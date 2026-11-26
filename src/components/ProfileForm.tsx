"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { inputClass, primaryButton, secondaryButton } from "@/lib/ui";

type Props = {
  mode: "onboarding" | "settings";
  userId: string;
  initial?: { username: string; displayName: string; bio: string; avatarUrl: string | null };
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ProfileForm({ mode, userId, initial }: Props) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, {});
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) return setUploadError("Pick an image file.");
    if (file.size > MAX_AVATAR_BYTES) return setUploadError("Images must be under 5 MB.");

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (error) return setUploadError("Upload failed. Please try again.");
    setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="avatarUrl" value={avatarUrl} />

      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Your profile photo" fill sizes="80px" className="object-cover" />
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className={secondaryButton}
          >
            {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Add photo"}
          </button>
          {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPickAvatar} />
        </div>
      </div>

      <Field label="Name" error={err.displayName}>
        <input name="displayName" defaultValue={initial?.displayName} maxLength={50} required className={inputClass} />
      </Field>

      <Field label="Username" error={err.username} hint="3 to 20 letters, numbers or underscores">
        <div className="flex items-center">
          <span className="mr-1 text-neutral-500">@</span>
          <input
            name="username"
            defaultValue={initial?.username}
            maxLength={20}
            required
            autoCapitalize="none"
            autoComplete="username"
            className={inputClass}
          />
        </div>
      </Field>

      <Field label="Bio" error={err.bio}>
        <textarea name="bio" defaultValue={initial?.bio} maxLength={160} rows={3} className={inputClass} />
      </Field>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.saved ? <p className="text-sm text-green-600">Profile saved.</p> : null}

      <button type="submit" disabled={pending || uploading} className={primaryButton}>
        {pending ? "Saving…" : mode === "onboarding" ? "Create profile" : "Save changes"}
      </button>
    </form>
  );
}

function Field(props: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{props.label}</span>
      {props.children}
      {props.error ? (
        <span className="text-sm text-red-600">{props.error}</span>
      ) : props.hint ? (
        <span className="text-xs text-neutral-500">{props.hint}</span>
      ) : null}
    </label>
  );
}
