"use server";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

export type StageResult = { ok: true } | { ok: false; error: string };

/** Takes one of the 5 speaker seats in a group's voice room. */
export async function takeSeat(groupId: string): Promise<StageResult> {
  if (!isUuid(groupId)) return { ok: false, error: "Unknown group." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;
  if (!userId) return { ok: false, error: "Please log in again." };
  const { error } = await supabase.from("group_room_speakers").insert({ group_id: groupId, user_id: userId });
  if (!error || error.code === "23505") return { ok: true };
  if (error.message.includes("stage_full")) return { ok: false, error: "All 5 seats are taken. Try again when someone leaves." };
  return { ok: false, error: "Could not take a seat. Are you a member of this group?" };
}

/** Leaves the stage; with userId, a group owner can free someone else's seat. */
export async function leaveSeat(groupId: string, userId?: string): Promise<StageResult> {
  if (!isUuid(groupId) || (userId && !isUuid(userId))) return { ok: false, error: "Unknown group." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const me = auth?.claims?.sub as string | undefined;
  if (!me) return { ok: false, error: "Please log in again." };
  await supabase.from("group_room_speakers").delete().eq("group_id", groupId).eq("user_id", userId ?? me);
  return { ok: true };
}
