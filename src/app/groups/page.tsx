import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupCard, TrendingCard } from "@/components/GroupCard";
import { searchGroups, trending } from "@/lib/groups";
import { getCurrentUserId } from "@/lib/profiles";
import { isTopic, TOPIC_KEYS, TOPICS } from "@/lib/topics";
import { inputClass, primaryButton } from "@/lib/ui";

export const metadata: Metadata = { title: "Groups" };

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function GroupsPage({ searchParams }: PageProps<"/groups">) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login?next=/groups");
  const sp = await searchParams;
  const q = first(sp.q);
  const rawTopic = first(sp.topic);
  const topic = isTopic(rawTopic) ? rawTopic : null;

  const groups = await searchGroups(q, userId, topic);
  const hot = q || topic ? [] : trending(groups);
  const mine = groups.filter((g) => g.joined);
  const rest = q || topic ? groups : groups.filter((g) => !hot.some((h) => h.id === g.id));

  const chipHref = (t: string | null) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (t) params.set("topic", t);
    const s = params.toString();
    return s ? `/groups?${s}` : "/groups";
  };

  return (
    <main className="flex-1">
      <section className="bg-hero-glow border-b border-border">
        <div className="mx-auto max-w-5xl px-6 pb-6 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Find your <span className="text-brand-gradient">people</span>
              </h1>
              <p className="mt-1 text-muted">Groups for every passion, from Sunday football to home cooking.</p>
            </div>
            <Link href="/groups/new" className={primaryButton}>
              + Create group
            </Link>
          </div>

          <form role="search" action="/groups" className="mt-6 flex gap-2">
            {topic ? <input type="hidden" name="topic" value={topic} /> : null}
            <label className="relative flex-1">
              <span className="sr-only">Search groups</span>
              <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search groups by name or topic"
                className={`${inputClass} !rounded-full !py-3 pl-11 shadow-sm`}
              />
            </label>
            <button type="submit" className={primaryButton}>
              Search
            </button>
          </form>

          <nav aria-label="Topics" className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
            <Link
              href={chipHref(null)}
              aria-current={topic ? undefined : "page"}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                topic ? "border-border bg-background hover:border-ring-brand" : "border-transparent bg-brand-gradient text-white"
              }`}
            >
              All
            </Link>
            {TOPIC_KEYS.filter((k) => k !== "other").map((k) => {
              const active = topic === k;
              return (
                <Link
                  key={k}
                  href={chipHref(active ? null : k)}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    active ? "border-transparent text-white" : "border-border bg-background hover:border-ring-brand"
                  }`}
                  style={active ? { backgroundImage: `linear-gradient(135deg, ${TOPICS[k].from}, ${TOPICS[k].to})` } : undefined}
                >
                  <span aria-hidden>{TOPICS[k].emoji}</span> {TOPICS[k].label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8">
        {hot.length ? (
          <section aria-labelledby="trending">
            <h2 id="trending" className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden>🔥</span> Trending now
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {hot.map((g, i) => (
                <TrendingCard key={g.id} group={g} rank={i + 1} />
              ))}
            </ul>
          </section>
        ) : null}

        {!q && !topic && mine.length ? (
          <section aria-labelledby="mine">
            <h2 id="mine" className="mb-3 text-lg font-semibold">
              Your groups
            </h2>
            <ul className="flex gap-3 overflow-x-auto pb-1">
              {mine.map((g) => (
                <li key={g.id} className="shrink-0">
                  <Link
                    href={`/groups/${g.slug}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-4 text-sm font-medium hover:border-ring-brand"
                  >
                    <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full text-base" style={{ backgroundImage: `linear-gradient(135deg, ${TOPICS[g.topic].from}, ${TOPICS[g.topic].to})` }}>
                      {TOPICS[g.topic].emoji}
                    </span>
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="all">
          <h2 id="all" className="mb-3 text-lg font-semibold">
            {q || topic
              ? `${groups.length} ${groups.length === 1 ? "group" : "groups"}${q ? ` for “${q}”` : ""}${topic ? ` in ${TOPICS[topic].label}` : ""}`
              : "Discover groups"}
          </h2>
          {rest.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <p className="text-4xl" aria-hidden>
                🔍
              </p>
              <p className="mt-2 font-medium">{q || topic ? "No groups match yet." : "No groups yet."}</p>
              <p className="text-sm text-muted">Start one and invite your friends.</p>
              <Link href="/groups/new" className={`${primaryButton} mt-4`}>
                Create a group
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
