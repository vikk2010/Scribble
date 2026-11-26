import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { GroupInitial } from "@/components/GroupCard";
import { getConversation } from "@/lib/chat";
import { getCurrentUserId } from "@/lib/profiles";
import { ChatRoom } from "./ChatRoom";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const me = await getCurrentUserId();
  if (!me) redirect(`/login?next=/messages/${id}`);
  const data = await getConversation(id);
  if (!data) notFound();
  const { conversation, members, messages } = data;
  const others = members.filter((m) => m.id !== me);
  const title = conversation.is_group ? (conversation.title ?? "Group chat") : (others[0]?.display_name ?? "Chat");
  const subtitle = conversation.is_group
    ? members.map((m) => (m.id === me ? "You" : m.display_name.split(" ")[0])).join(", ")
    : others[0]
      ? `@${others[0].username}`
      : "";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4">
      <header className="flex items-center gap-3 border-b border-border pb-3">
        <Link href="/messages" className="rounded-full px-2 py-1 text-sm font-medium text-brand hover:bg-surface" aria-label="Back to messages">
          ←
        </Link>
        {conversation.is_group ? (
          <GroupInitial name={title} size={40} />
        ) : (
          <Avatar name={title} url={others[0]?.avatar_url ?? null} size={40} />
        )}
        <div className="min-w-0 leading-tight">
          <h1 className="truncate font-semibold">
            {!conversation.is_group && others[0] ? (
              <Link href={`/u/${others[0].username}`} className="hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h1>
          <p className="truncate text-sm text-muted">{subtitle}</p>
        </div>
      </header>
      <ChatRoom
        conversationId={conversation.id}
        me={me}
        isGroup={conversation.is_group}
        members={members}
        initialMessages={messages}
      />
    </main>
  );
}
