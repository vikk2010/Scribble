import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupCard } from "@/components/GroupCard";
import { searchGroups } from "@/lib/groups";
import { getCurrentUserId } from "@/lib/profiles";
import { inputClass, primaryButton } from "@/lib/ui";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage({ searchParams }: PageProps<"/groups">) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login?next=/groups");
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const groups = await searchGroups(q, userId);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <Link href="/groups/new" className={`${primaryButton} !py-2 text-sm`}>
          Create group
        </Link>
      </div>

      <form role="search" action="/groups" className="mb-6 flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Search groups</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search groups by name or topic"
            className={inputClass}
          />
        </label>
        <button type="submit" className={`${primaryButton} !py-2`}>
          Search
        </button>
      </form>

      <h2 className="mb-3 text-sm font-medium text-muted">
        {q ? `${groups.length} ${groups.length === 1 ? "result" : "results"} for “${q}”` : "Newest groups"}
      </h2>
      {groups.length ? (
        <ul className="flex flex-col gap-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          {q ? "No groups match that search. Try another word, or create one." : "No groups yet. Be the first to create one."}
        </p>
      )}
    </main>
  );
}
