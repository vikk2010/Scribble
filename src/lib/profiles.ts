import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
};

const PROFILE_COLUMNS = "id, username, display_name, bio, avatar_url, created_at";

/** The signed-in user's id, verified against Supabase, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

export async function getMyProfile(): Promise<{ userId: string | null; profile: Profile | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { userId: null, profile: null };
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<Profile>();
  return { userId, profile: data };
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle<Profile>();
  return data;
}
