import "server-only";
import { createClient } from "@/lib/supabase/server";
import { shuffle } from "@/lib/validation";

export type Post = {
  id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  author: { username: string; display_name: string; avatar_url: string | null } | null;
};

const POST_COLUMNS =
  "id, body, image_url, created_at, author:profiles!posts_author_id_fkey(username, display_name, avatar_url)";

/** The newest posts from everyone, shown in a random order on each visit. */
export async function getLatestPostsShuffled(limit = 50): Promise<Post[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Post[]>();
  return shuffle(data ?? []);
}

export async function getPostsByAuthor(authorId: string, limit = 50): Promise<Post[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Post[]>();
  return data ?? [];
}
