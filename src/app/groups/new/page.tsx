import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/profiles";
import { GroupForm } from "./GroupForm";

export const metadata: Metadata = { title: "Create a group" };

export default async function NewGroupPage() {
  if (!(await getCurrentUserId())) redirect("/login?next=/groups/new");
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Create a group</h1>
      <p className="mb-8 mt-1 text-sm text-muted">Bring people together around a topic, place or interest.</p>
      <GroupForm />
    </main>
  );
}
