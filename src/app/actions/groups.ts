"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTopic } from "@/lib/topics";
import { groupSchema, slugify } from "@/lib/validation";

export type GroupFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "description", string>>;
};

async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect("/login?next=/groups");
  return { supabase, userId };
}

export async function createGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const { supabase, userId } = await requireUserId();
  const parsed = groupSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: GroupFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "name" | "description";
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const rawTopic = formData.get("topic");
  const topic = isTopic(rawTopic) ? rawTopic : null;

  let base = slugify(parsed.data.name);
  if (base.length < 3) base = `group-${base}`.replace(/-+$/, "");

  // Retry with a short suffix if another group already uses the slug.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase
      .from("groups")
      .insert({ slug, name: parsed.data.name, description: parsed.data.description, topic, created_by: userId });
    if (!error) {
      revalidatePath("/groups");
      redirect(`/groups/${slug}`);
    }
    if (error.code !== "23505") break;
  }
  return { error: "Could not create the group. Please try again." };
}

export async function joinGroup(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const groupId = String(formData.get("groupId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  await supabase.from("group_members").insert({ group_id: groupId, user_id: userId });
  revalidatePath("/groups");
  if (slug) revalidatePath(`/groups/${slug}`);
}

export async function leaveGroup(formData: FormData) {
  const { supabase, userId } = await requireUserId();
  const groupId = String(formData.get("groupId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId).eq("role", "member");
  revalidatePath("/groups");
  if (slug) revalidatePath(`/groups/${slug}`);
}
