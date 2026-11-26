import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { GroupInitial, MembershipButton } from "@/components/GroupCard";
import { getGroupBySlug } from "@/lib/groups";
import { getCurrentUserId } from "@/lib/profiles";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params }: PageProps<"/groups/[slug]">) {
  const { slug } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/login?next=/groups/${slug}`);
  const group = await getGroupBySlug(slug, userId);
  if (!group) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href="/groups" className="text-sm text-brand hover:underline">
        ← All groups
      </Link>
      <section className="mt-4 flex items-start gap-5">
        <GroupInitial name={group.name} size={72} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{group.name}</h1>
              <p className="text-sm text-muted">
                {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
              </p>
            </div>
            <MembershipButton group={group} isOwner={group.createdBy === userId} />
          </div>
          {group.description ? <p className="mt-3 whitespace-pre-line">{group.description}</p> : null}
        </div>
      </section>

      <h2 className="mb-3 mt-10 font-semibold">Members</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {group.members.map((m) => (
          <li key={m.username} className="flex items-center gap-3">
            <Avatar name={m.display_name} url={m.avatar_url} size={36} />
            <div className="leading-tight">
              <Link href={`/u/${m.username}`} className="font-medium hover:underline">
                {m.display_name}
              </Link>
              <p className="text-sm text-muted">
                @{m.username}
                {m.role === "owner" ? " · Owner" : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
