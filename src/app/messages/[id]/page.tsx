import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { startCall } from "@/app/actions/calls";
import { GroupInitial } from "@/components/GroupCard";
import { getConversation } from "@/lib/chat";
import { getCurrentUserId } from "@/lib/profiles";
import { ChatRoom } from "./ChatRoom";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({ params, searchParams }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
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
        <div className="min-w-0 flex-1 leading-tight">
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
        <div className="flex gap-1">
          {(["audio", "video"] as const).map((kind) => (
            <form key={kind} action={startCall}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input type="hidden" name="kind" value={kind} />
              <button
                type="submit"
                aria-label={kind === "audio" ? `Voice call ${title}` : `Video call ${title}`}
                title={kind === "audio" ? "Voice call" : "Video call"}
                className="rounded-full p-2.5 text-brand hover:bg-surface"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {kind === "audio" ? (
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
                  ) : (
                    <>
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" />
                    </>
                  )}
                </svg>
              </button>
            </form>
          ))}
        </div>
      </header>
      {sp.error === "call" ? (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
          Could not start the call. Please try again.
        </p>
      ) : null}
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
