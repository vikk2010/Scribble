import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

export type CallStatus = "ringing" | "active" | "ended" | "missed" | "declined";
export type Call = {
  id: string;
  conversation_id: string;
  started_by: string;
  kind: "audio" | "video";
  status: CallStatus;
  created_at: string;
};

export const CALL_COLUMNS = "id, conversation_id, started_by, kind, status, created_at";

/** A call the signed-in user can see (RLS limits this to conversation members). */
export async function getCall(id: string): Promise<Call | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("calls").select(CALL_COLUMNS).eq("id", id).maybeSingle<Call>();
  return data;
}
