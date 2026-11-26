import "server-only";
import { createClient } from "@/lib/supabase/server";
import { shuffle } from "@/lib/validation";

export type Author = { username: string; display_name: string; avatar_url: string | null };

export type Post = {
  id: string;
  body: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  author: Author | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type Comment = { id: string; body: string; created_at: string; author: Author | null };

type PostRow = Omit<Post, "likeCount" | "commentCount" | "likedByMe"> & {
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

const POST_COLUMNS =
  "id, body, image_url, video_url, created_at, author:profiles!posts_author_id_fkey(username, display_name, avatar_url), post_likes(count), post_comments(count)";

async function hydrate(rows: PostRow[], viewerId: string | null): Promise<Post[]> {
  let liked = new Set<string>();
  if (viewerId && rows.length) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", viewerId)
      .in("post_id", rows.map((r) => r.id));
    liked = new Set((data ?? []).map((l) => l.post_id));
  }
  return rows.map(({ post_likes, post_comments, ...r }) => ({
    ...r,
    likeCount: post_likes?.[0]?.count ?? 0,
    commentCount: post_comments?.[0]?.count ?? 0,
    likedByMe: liked.has(r.id),
  }));
}

/** The newest posts from everyone, shown in a random order on each visit. */
export async function getLatestPostsShuffled(viewerId: string | null, limit = 50): Promise<Post[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PostRow[]>();
  return shuffle(await hydrate(data ?? [], viewerId));
}

export async function getPostsByAuthor(authorId: string, viewerId: string | null, limit = 50): Promise<Post[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PostRow[]>();
  return hydrate(data ?? [], viewerId);
}

export async function getPostWithComments(
  id: string,
  viewerId: string | null,
): Promise<{ post: Post; comments: Comment[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select(POST_COLUMNS).eq("id", id).maybeSingle<PostRow>();
  if (!data) return null;
  const [[post], { data: comments }] = await Promise.all([
    hydrate([data], viewerId),
    supabase
      .from("post_comments")
      .select("id, body, created_at, author:profiles!post_comments_author_id_fkey(username, display_name, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .limit(200)
      .returns<Comment[]>(),
  ]);
  return { post, comments: comments ?? [] };
}
