"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/env";
import { commentSchema, postSchema } from "@/lib/validation";

export type PostFormState = { error?: string; posted?: number };

export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;
  if (!userId) redirect("/login");

  const parsed = postSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const imagePrefix = `${supabaseUrl}/storage/v1/object/public/post-images/${userId}/`;
  const rawImage = String(formData.get("imageUrl") ?? "");
  const imageUrl = rawImage.startsWith(imagePrefix) ? rawImage : null;

  const videoPrefix = `${supabaseUrl}/storage/v1/object/public/post-videos/${userId}/`;
  const rawVideo = String(formData.get("videoUrl") ?? "");
  const videoUrl = !imageUrl && rawVideo.startsWith(videoPrefix) ? rawVideo : null;

  if (!parsed.data.body && !imageUrl && !videoUrl) return { error: "Write something or add a photo or video." };

  const { error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body: parsed.data.body, image_url: imageUrl, video_url: videoUrl });
  if (error) return { error: "Could not post. Please try again." };

  revalidatePath("/");
  return { posted: Date.now() };
}

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

/** Likes or unlikes a post for the signed-in user. Returns false when signed out. */
export async function setLike(postId: string, liked: boolean): Promise<boolean> {
  const { supabase, userId } = await requireUser();
  if (!userId) return false;
  const { error } = liked
    ? await supabase.from("post_likes").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  return !error;
}

export type CommentFormState = { error?: string; commented?: number };

export async function addComment(_prev: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const { supabase, userId } = await requireUser();
  const postId = String(formData.get("postId") ?? "");
  if (!userId) redirect(`/login?next=/p/${postId}`);
  const parsed = commentSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: userId, body: parsed.data.body });
  if (error) return { error: "Could not add your comment. Please try again." };
  revalidatePath(`/p/${postId}`);
  return { commented: Date.now() };
}
