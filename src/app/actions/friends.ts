"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect("/login?next=/friends");
  return { supabase, userId };
}

function otherId(formData: FormData): string | null {
  const id = String(formData.get("userId") ?? "");
  return isUuid(id) ? id : null;
}

function refresh(formData: FormData) {
  revalidatePath("/friends");
  const username = String(formData.get("username") ?? "");
  if (username) revalidatePath(`/u/${username}`);
}

export async function sendFriendRequest(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const other = otherId(formData);
  if (other && other !== userId) {
    await supabase.from("friendships").insert({ requester_id: userId, addressee_id: other });
  }
  refresh(formData);
}

export async function acceptFriendRequest(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const other = otherId(formData);
  if (!other) return;
  await supabase
    .from("friendships")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("requester_id", other)
    .eq("addressee_id", userId);
  refresh(formData);
}

/** Declines or cancels a request, or removes a friend. */
export async function removeFriendship(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const other = otherId(formData);
  if (!other) return;
  await supabase
    .from("friendships")
    .delete()
    .or(`and(requester_id.eq.${userId},addressee_id.eq.${other}),and(requester_id.eq.${other},addressee_id.eq.${userId})`);
  refresh(formData);
}

export async function openDirectChat(formData: FormData) {
  const { supabase } = await requireUser();
  const other = otherId(formData);
  if (!other) redirect("/friends");
  const { data, error } = await supabase.rpc("start_direct_conversation", { other });
  if (error || !data) redirect("/friends?error=chat");
  redirect(`/messages/${data}`);
}

export type GroupChatState = { error?: string };

export async function createGroupChat(_prev: GroupChatState, formData: FormData): Promise<GroupChatState> {
  const { supabase } = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const memberIds = formData.getAll("members").map(String).filter(isUuid);
  if (title.length < 1 || title.length > 50) return { error: "Give the chat a name (up to 50 characters)." };
  if (memberIds.length < 2) return { error: "Pick at least two friends." };
  const { data, error } = await supabase.rpc("create_group_conversation", { chat_title: title, member_ids: memberIds });
  if (error || !data) return { error: "Could not create the chat. Please try again." };
  redirect(`/messages/${data}`);
}
