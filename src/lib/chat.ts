import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Person } from "@/lib/friends";

export type InboxItem = {
  id: string;
  is_group: boolean;
  title: string | null;
  last_message_at: string;
  last_message: string | null;
  last_sender_id: string | null;
  unread: boolean;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  member_count: number;
};

export type Message = { id: string; body: string; sender_id: string; created_at: string };

export async function getInbox(): Promise<InboxItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_conversations");
  return (data as InboxItem[] | null) ?? [];
}

export async function getConversation(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, is_group, title")
    .eq("id", id)
    .maybeSingle<{ id: string; is_group: boolean; title: string | null }>();
  if (!conversation) return null;

  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase
      .from("conversation_members")
      .select("profile:profiles!conversation_members_user_id_fkey(id, username, display_name, avatar_url)")
      .eq("conversation_id", id)
      .returns<{ profile: Person | null }[]>(),
    supabase
      .from("messages")
      .select("id, body, sender_id, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Message[]>(),
  ]);

  return {
    conversation,
    members: (members ?? []).flatMap((m) => (m.profile ? [m.profile] : [])),
    messages: (messages ?? []).reverse(),
  };
}
