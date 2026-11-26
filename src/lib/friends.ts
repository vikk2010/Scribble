import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Author } from "@/lib/posts";
import { cleanSearchTerm, isUuid } from "@/lib/validation";

export type Person = Author & { id: string };
export type FriendState = "self" | "none" | "outgoing" | "incoming" | "friends";

type Row = {
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  requester: Person | null;
  addressee: Person | null;
};

const PERSON = "id, username, display_name, avatar_url";

export async function getFriendState(me: string | null, other: string): Promise<FriendState> {
  if (!me) return "none";
  if (me === other) return "self";
  if (!isUuid(me) || !isUuid(other)) return "none";
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(`and(requester_id.eq.${me},addressee_id.eq.${other}),and(requester_id.eq.${other},addressee_id.eq.${me})`)
    .maybeSingle<Pick<Row, "requester_id" | "addressee_id" | "status">>();
  if (!data) return "none";
  if (data.status === "accepted") return "friends";
  return data.requester_id === me ? "outgoing" : "incoming";
}

export async function getMyFriendships(me: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select(
      `requester_id, addressee_id, status, requester:profiles!friendships_requester_id_fkey(${PERSON}), addressee:profiles!friendships_addressee_id_fkey(${PERSON})`,
    )
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  const rows = data ?? [];
  const other = (r: Row) => (r.requester_id === me ? r.addressee : r.requester);
  const people = (list: Row[]) => list.flatMap((r) => (other(r) ? [other(r)!] : []));
  return {
    friends: people(rows.filter((r) => r.status === "accepted")).sort((a, b) => a.display_name.localeCompare(b.display_name)),
    incoming: people(rows.filter((r) => r.status === "pending" && r.addressee_id === me)),
    outgoing: people(rows.filter((r) => r.status === "pending" && r.requester_id === me)),
  };
}

export async function searchPeople(query: string, me: string): Promise<Person[]> {
  const term = cleanSearchTerm(query);
  if (!term) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PERSON)
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .neq("id", me)
    .limit(20)
    .returns<Person[]>();
  return data ?? [];
}
