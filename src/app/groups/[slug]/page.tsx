import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { MembershipButton, TopicChip } from "@/components/GroupCard";
import { getGroupBySlug } from "@/lib/groups";
import { getCurrentUserId } from "@/lib/profiles";
import { coverStyle, TOPICS } from "@/lib/topics";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params }: PageProps<"/groups/[slug]">) {
  const { slug } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/login?next=/groups/${slug}`);
  const group = await getGroupBySlug(slug, userId);
  if (!group) notFound();
  const t = TOPICS[group.topic];
  const created = new Date(group.createdAt).toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <main className="flex-1">
      <div className="relative h-44 overflow-hidden sm:h-56" style={coverStyle(group.topic)}>
        <span aria-hidden className="absolute -bottom-10 right-4 select-none text-[11rem] opacity-25 sm:right-16">
          {t.emoji}
        </span>
        <div className="mx-auto max-w-3xl px-6 pt-5">
          <Link href="/groups" className="rounded-full bg-black/35 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/50">
            ← All groups
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6">
        <section className="relative z-10 -mt-12 rounded-3xl border border-border bg-background p-6 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div aria-hidden className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-md" style={coverStyle(group.topic)}>
                {t.emoji}
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">{group.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <TopicChip topic={group.topic} />
                  <span>
                    {group.memberCount} {group.memberCount === 1 ? "member" : "members"} · Since {created}
                  </span>
                </div>
              </div>
            </div>
            <MembershipButton group={group} isOwner={group.createdBy === userId} />
          </div>
          {group.description ? <p className="mt-4 whitespace-pre-line">{group.description}</p> : null}
        </section>

        <section aria-labelledby="members" className="py-8">
          <h2 id="members" className="mb-4 text-lg font-semibold">
            Members <span className="text-muted">({group.memberCount})</span>
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.members.map((m) => (
              <li key={m.username} className="flex items-center gap-3 rounded-2xl border border-border p-3 transition hover:border-ring-brand">
                <Avatar name={m.display_name} url={m.avatar_url} size={40} />
                <div className="min-w-0 leading-tight">
                  <Link href={`/u/${m.username}`} className="font-medium hover:underline">
                    {m.display_name}
                  </Link>
                  <p className="text-sm text-muted">@{m.username}</p>
                </div>
                {m.role === "owner" ? (
                  <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold">Owner</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
