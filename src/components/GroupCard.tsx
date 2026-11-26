import Link from "next/link";
import { joinGroup, leaveGroup } from "@/app/actions/groups";
import { Avatar } from "@/components/Avatar";
import type { GroupSummary, MemberPreview } from "@/lib/groups";
import { coverStyle, TOPICS, type Topic } from "@/lib/topics";
import { primaryButton, secondaryButton } from "@/lib/ui";

export function GroupInitial({ name, size = 48, topic }: { name: string; size?: number; topic?: Topic }) {
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl font-bold text-white ${topic ? "" : "bg-brand-gradient"}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), ...(topic ? coverStyle(topic) : {}) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function TopicChip({ topic, onDark = false }: { topic: Topic; onDark?: boolean }) {
  const t = TOPICS[topic];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        onDark ? "bg-black/35 text-white backdrop-blur-sm" : "bg-surface text-foreground"
      }`}
    >
      <span aria-hidden>{t.emoji}</span>
      {t.label}
    </span>
  );
}

export function MemberStack({ members, total }: { members: MemberPreview[]; total: number }) {
  const extra = Math.max(0, total - members.length);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2" aria-hidden>
        {members.map((m, i) => (
          <Avatar key={i} name={m.display_name} url={m.avatar_url} size={26} className="ring-2 ring-background" />
        ))}
        {extra > 0 ? (
          <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-surface px-1.5 text-[11px] font-semibold ring-2 ring-background">
            +{extra}
          </span>
        ) : null}
      </div>
      <span className="text-sm text-muted">
        {total} {total === 1 ? "member" : "members"}
      </span>
    </div>
  );
}

export function MembershipButton({ group, isOwner = false, compact = false }: { group: GroupSummary; isOwner?: boolean; compact?: boolean }) {
  if (isOwner) return <span className="text-sm font-medium text-muted">You own this group</span>;
  return (
    <form action={group.joined ? leaveGroup : joinGroup}>
      <input type="hidden" name="groupId" value={group.id} />
      <input type="hidden" name="slug" value={group.slug} />
      <button
        type="submit"
        aria-label={`${group.joined ? "Leave" : "Join"} ${group.name}`}
        className={group.joined ? secondaryButton : `${primaryButton} ${compact ? "!px-4 !py-1.5 text-sm" : ""}`}
      >
        {group.joined ? "Leave" : "Join"}
      </button>
    </form>
  );
}

/** A group tile: topic-coloured cover, name, description, members and a join button. */
export function GroupCard({ group }: { group: GroupSummary }) {
  const t = TOPICS[group.topic];
  return (
    <li className="group/card relative flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative h-24 overflow-hidden" style={coverStyle(group.topic)}>
        <span
          aria-hidden
          className="absolute -right-2 -top-3 select-none text-7xl opacity-30 transition duration-300 group-hover/card:scale-110 group-hover/card:rotate-6 motion-reduce:transition-none"
        >
          {t.emoji}
        </span>
        <div className="absolute bottom-2 left-3">
          <TopicChip topic={group.topic} onDark />
        </div>
        {group.joined ? (
          <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-neutral-900">
            ✓ Joined
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-semibold leading-tight">
            {/* The whole card is clickable; the button below sits above this link. */}
            <Link href={`/groups/${group.slug}`} className="after:absolute after:inset-0 hover:underline">
              {group.name}
            </Link>
          </h3>
          {group.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{group.description}</p> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <MemberStack members={group.preview} total={group.memberCount} />
          {group.joined ? null : (
            <div className="relative z-10">
              <MembershipButton group={group} compact />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** A wide card for the trending row. */
export function TrendingCard({ group, rank }: { group: GroupSummary; rank: number }) {
  const t = TOPICS[group.topic];
  return (
    <li className="group/card relative overflow-hidden rounded-3xl p-5 text-white shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0" style={coverStyle(group.topic)}>
      <span aria-hidden className="absolute -bottom-10 -right-6 select-none text-[7rem] opacity-20 transition duration-300 group-hover/card:scale-110 motion-reduce:transition-none">
        {t.emoji}
      </span>
      <div className="relative flex h-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-neutral-900">#{rank} trending</span>
          <TopicChip topic={group.topic} onDark />
        </div>
        <h3 className="text-xl font-bold leading-tight">
          <Link href={`/groups/${group.slug}`} className="after:absolute after:inset-0 hover:underline">
            {group.name}
          </Link>
        </h3>
        {group.description ? <p className="line-clamp-2 text-sm text-white">{group.description}</p> : null}
        <p className="mt-auto text-sm font-semibold">
          {group.memberCount} members{group.joined ? " · You're in" : ""}
        </p>
      </div>
    </li>
  );
}
