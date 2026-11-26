import "server-only";
import type { Message } from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";

export const MAX_SPEAKERS = 5;

export async function getGroupMessages(groupId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_messages")
    .select("id, body, sender_id, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Message[]>();
  return (data ?? []).reverse();
}

export async function getSpeakerIds(groupId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_room_speakers")
    .select("user_id")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  return (data ?? []).map((r) => r.user_id as string);
}
