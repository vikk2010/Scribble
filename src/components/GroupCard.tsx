import Link from "next/link";
import { joinGroup, leaveGroup } from "@/app/actions/groups";
import type { GroupSummary } from "@/lib/groups";
import { card, primaryButton, secondaryButton } from "@/lib/ui";

export function GroupInitial({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-xl bg-brand-gradient font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function MembershipButton({ group, isOwner = false }: { group: GroupSummary; isOwner?: boolean }) {
  if (isOwner) return <span className="text-sm font-medium text-muted">You own this group</span>;
  return (
    <form action={group.joined ? leaveGroup : joinGroup}>
      <input type="hidden" name="groupId" value={group.id} />
      <input type="hidden" name="slug" value={group.slug} />
      <button type="submit" className={group.joined ? secondaryButton : `${primaryButton} !px-4 !py-1.5 text-sm`}>
        {group.joined ? "Leave" : "Join"}
      </button>
    </form>
  );
}

export function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <li className={`${card} flex items-center gap-4 p-4`}>
      <GroupInitial name={group.name} />
      <div className="min-w-0 flex-1">
        <Link href={`/groups/${group.slug}`} className="font-semibold hover:underline">
          {group.name}
        </Link>
        <p className="text-sm text-muted">
          {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
          {group.joined ? " · Joined" : ""}
        </p>
        {group.description ? <p className="mt-1 line-clamp-2 text-sm">{group.description}</p> : null}
      </div>
      {group.joined ? null : <MembershipButton group={group} />}
    </li>
  );
}
