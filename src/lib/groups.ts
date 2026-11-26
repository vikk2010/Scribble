import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cleanSearchTerm } from "@/lib/validation";

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  joined: boolean;
};

type GroupRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  created_at: string;
  group_members: { count: number }[];
};

const GROUP_COLUMNS = "id, slug, name, description, created_at, group_members(count)";

async function withJoined(rows: GroupRow[], userId: string): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const { data: mine } = ids.length
    ? await supabase.from("group_members").select("group_id").eq("user_id", userId).in("group_id", ids)
    : { data: [] as { group_id: string }[] };
  const joined = new Set((mine ?? []).map((m) => m.group_id));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    memberCount: r.group_members?.[0]?.count ?? 0,
    joined: joined.has(r.id),
  }));
}

/** Groups whose name or description matches the search, or the newest groups when it is empty. */
export async function searchGroups(query: string, userId: string, limit = 30): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const term = cleanSearchTerm(query);
  let request = supabase.from("groups").select(GROUP_COLUMNS);
  if (term) request = request.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  const { data } = await request.order("created_at", { ascending: false }).limit(limit).returns<GroupRow[]>();
  return withJoined(data ?? [], userId);
}

export type GroupDetail = GroupSummary & {
  createdBy: string;
  members: { username: string; display_name: string; avatar_url: string | null; role: string }[];
};

export async function getGroupBySlug(slug: string, userId: string): Promise<GroupDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select(`${GROUP_COLUMNS}, created_by`)
    .eq("slug", slug)
    .maybeSingle<GroupRow & { created_by: string }>();
  if (!data) return null;
  const [summary] = await withJoined([data], userId);
  const { data: members } = await supabase
    .from("group_members")
    .select("role, profile:profiles!group_members_user_id_fkey(username, display_name, avatar_url)")
    .eq("group_id", data.id)
    .order("joined_at", { ascending: true })
    .limit(24)
    .returns<{ role: string; profile: { username: string; display_name: string; avatar_url: string | null } | null }[]>();
  return {
    ...summary,
    createdBy: data.created_by,
    members: (members ?? []).flatMap((m) => (m.profile ? [{ ...m.profile, role: m.role }] : [])),
  };
}
