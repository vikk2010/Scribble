import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { GroupInitial } from "@/components/GroupCard";
import { timeAgo } from "@/components/PostCard";
import { getInbox } from "@/lib/chat";
import { getCurrentUserId } from "@/lib/profiles";
import { card, primaryButton } from "@/lib/ui";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const me = await getCurrentUserId();
  if (!me) redirect("/login?next=/messages");
  const inbox = await getInbox();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <Link href="/messages/new" className={`${primaryButton} !py-2 text-sm`}>
          New group chat
        </Link>
      </div>
      {inbox.length ? (
        <ul className={`${card} divide-y divide-border overflow-hidden`}>
          {inbox.map((c) => {
            const name = c.is_group ? (c.title ?? "Group chat") : (c.other_display_name ?? "Deleted user");
            const preview = c.last_message
              ? `${c.last_sender_id === me ? "You: " : ""}${c.last_message}`
              : c.is_group
                ? `${c.member_count} members · say hello`
                : "Say hello";
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-surface">
                  {c.is_group ? (
                    <GroupInitial name={name} size={48} />
                  ) : (
                    <Avatar name={name} url={c.other_avatar_url} size={48} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{name}</p>
                      <time dateTime={c.last_message_at} className="shrink-0 text-xs text-muted">
                        {timeAgo(c.last_message_at)}
                      </time>
                    </div>
                    <p className={`truncate text-sm ${c.unread ? "font-semibold text-foreground" : "text-muted"}`}>{preview}</p>
                  </div>
                  {c.unread ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-gradient">
                      <span className="sr-only">Unread</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No conversations yet. Open a friend&apos;s profile and press Message, or{" "}
          <Link href="/friends" className="font-medium text-brand hover:underline">
            find friends
          </Link>
          .
        </p>
      )}
    </main>
  );
}
