import "server-only";
import { createClient } from "@/lib/supabase/server";
import { topicOf, type Topic } from "@/lib/topics";
import { cleanSearchTerm } from "@/lib/validation";

export type MemberPreview = { display_name: string; avatar_url: string | null };

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  topic: Topic;
  createdAt: string;
  memberCount: number;
  joined: boolean;
  preview: MemberPreview[];
};

type GroupRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  topic: string | null;
  created_at: string;
  group_members: { count: number }[];
};

const GROUP_COLUMNS = "id, slug, name, description, topic, created_at, group_members(count)";

async function hydrate(rows: GroupRow[], userId: string): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const [{ data: mine }, { data: members }] = ids.length
    ? await Promise.all([
        supabase.from("group_members").select("group_id").eq("user_id", userId).in("group_id", ids),
        supabase
          .from("group_members")
          .select("group_id, profile:profiles!group_members_user_id_fkey(display_name, avatar_url)")
          .in("group_id", ids)
          .order("joined_at", { ascending: true })
          .limit(ids.length * 4)
          .returns<{ group_id: string; profile: MemberPreview | null }[]>(),
      ])
    : [{ data: [] as { group_id: string }[] }, { data: [] as { group_id: string; profile: MemberPreview | null }[] }];

  const joined = new Set((mine ?? []).map((m) => m.group_id));
  const previews = new Map<string, MemberPreview[]>();
  for (const m of members ?? []) {
    const list = previews.get(m.group_id) ?? [];
    if (m.profile && list.length < 4) list.push(m.profile);
    previews.set(m.group_id, list);
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    topic: topicOf(r),
    createdAt: r.created_at,
    memberCount: r.group_members?.[0]?.count ?? 0,
    joined: joined.has(r.id),
    preview: previews.get(r.id) ?? [],
  }));
}

/** Groups matching the search and topic, newest first. Empty search lists the newest groups. */
export async function searchGroups(
  query: string,
  userId: string,
  topic: Topic | null = null,
  limit = 60,
): Promise<GroupSummary[]> {
  const supabase = await createClient();
  const term = cleanSearchTerm(query);
  let request = supabase.from("groups").select(GROUP_COLUMNS);
  if (term) request = request.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  const { data } = await request.order("created_at", { ascending: false }).limit(limit).returns<GroupRow[]>();
  const groups = await hydrate(data ?? [], userId);
  return topic ? groups.filter((g) => g.topic === topic) : groups;
}

/** The busiest groups among the given ones. */
export function trending(groups: GroupSummary[], count = 3): GroupSummary[] {
  return [...groups].filter((g) => g.memberCount > 1).sort((a, b) => b.memberCount - a.memberCount).slice(0, count);
}

export type GroupDetail = GroupSummary & {
  createdBy: string;
  members: { id: string; username: string; display_name: string; avatar_url: string | null; role: string }[];
};

export async function getGroupBySlug(slug: string, userId: string): Promise<GroupDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select(`${GROUP_COLUMNS}, created_by`)
    .eq("slug", slug)
    .maybeSingle<GroupRow & { created_by: string }>();
  if (!data) return null;
  const [summary] = await hydrate([data], userId);
  const { data: members } = await supabase
    .from("group_members")
    .select("role, profile:profiles!group_members_user_id_fkey(id, username, display_name, avatar_url)")
    .eq("group_id", data.id)
    .order("joined_at", { ascending: true })
    .limit(200)
    .returns<{ role: string; profile: { id: string; username: string; display_name: string; avatar_url: string | null } | null }[]>();
  return {
    ...summary,
    createdBy: data.created_by,
    members: (members ?? []).flatMap((m) => (m.profile ? [{ ...m.profile, role: m.role }] : [])),
  };
}
