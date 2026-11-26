"use server";

import { redirect } from "next/navigation";
import { getCall, type CallStatus } from "@/lib/calls";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect("/login?next=/messages");
  return { supabase, userId };
}

export async function startCall(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const conversationId = String(formData.get("conversationId") ?? "");
  const kind = formData.get("kind") === "video" ? "video" : "audio";
  if (!isUuid(conversationId)) redirect("/messages");
  const { data, error } = await supabase
    .from("calls")
    .insert({ conversation_id: conversationId, started_by: userId, kind })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) redirect(`/messages/${conversationId}?error=call`);
  redirect(`/calls/${data.id}`);
}

type Action = "accept" | "decline" | "cancel" | "missed" | "end";

/** Moves a call through ringing -> active -> ended, or ends it unanswered. */
export async function updateCall(callId: string, action: Action): Promise<CallStatus | null> {
  const { supabase, userId } = await requireUser();
  const call = await getCall(callId);
  if (!call) return null;
  const isCaller = call.started_by === userId;
  const now = new Date().toISOString();

  let patch: Record<string, unknown> | null = null;
  let from: CallStatus[] = [];
  if (action === "accept" && !isCaller) {
    patch = { status: "active", answered_at: now };
    from = ["ringing"];
  } else if (action === "decline" && !isCaller) {
    patch = { status: "declined", ended_at: now };
    from = ["ringing"];
  } else if ((action === "cancel" || action === "missed") && isCaller) {
    patch = { status: "missed", ended_at: now };
    from = ["ringing"];
  } else if (action === "end") {
    patch = { status: "ended", ended_at: now };
    from = ["active"];
  }
  if (!patch) return call.status;

  const { data } = await supabase
    .from("calls")
    .update(patch)
    .eq("id", callId)
    .in("status", from)
    .select("status")
    .maybeSingle<{ status: CallStatus }>();
  return data?.status ?? call.status;
}
