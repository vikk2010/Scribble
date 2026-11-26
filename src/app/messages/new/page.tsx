import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyFriendships } from "@/lib/friends";
import { getCurrentUserId } from "@/lib/profiles";
import { GroupChatForm } from "./GroupChatForm";

export const metadata: Metadata = { title: "New group chat" };

export default async function NewGroupChatPage() {
  const me = await getCurrentUserId();
  if (!me) redirect("/login?next=/messages/new");
  const { friends } = await getMyFriendships(me);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">New group chat</h1>
      <p className="mb-8 mt-1 text-sm text-muted">Chat with several friends at once.</p>
      {friends.length >= 2 ? (
        <GroupChatForm friends={friends} />
      ) : (
        <p className="text-muted">
          You need at least two friends to start a group chat.{" "}
          <Link href="/friends" className="font-medium text-brand hover:underline">
            Find friends
          </Link>
        </p>
      )}
    </main>
  );
}
