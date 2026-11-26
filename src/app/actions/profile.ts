"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/env";
import { profileSchema } from "@/lib/validation";

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"username" | "displayName" | "bio", string>>;
  saved?: boolean;
};

export async function saveProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;
  if (!userId) redirect("/login");

  const parsed = profileSchema.safeParse({
    username: formData.get("username") ?? "",
    displayName: formData.get("displayName") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: ProfileFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProfileFormState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  // Only accept avatar URLs from this user's own folder in our avatars bucket.
  const avatarPrefix = `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/`;
  const rawAvatar = String(formData.get("avatarUrl") ?? "");
  const avatarUrl = rawAvatar.startsWith(avatarPrefix) ? rawAvatar : null;

  const { username, displayName, bio } = parsed.data;
  const row: Record<string, unknown> = {
    id: userId,
    username,
    display_name: displayName,
    bio,
  };
  if (avatarUrl) row.avatar_url = avatarUrl;

  const { error } = await supabase.from("profiles").upsert(row);
  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { username: "That username is taken." } };
    }
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath(`/u/${username}`);
  if (formData.get("mode") === "onboarding") redirect(`/u/${username}`);
  return { saved: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
