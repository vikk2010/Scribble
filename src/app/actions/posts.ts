"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/env";
import { postSchema } from "@/lib/validation";

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

  if (!parsed.data.body && !imageUrl) return { error: "Write something or add a photo." };

  const { error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body: parsed.data.body, image_url: imageUrl });
  if (error) return { error: "Could not post. Please try again." };

  revalidatePath("/");
  return { posted: Date.now() };
}
