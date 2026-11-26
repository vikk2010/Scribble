import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCall } from "@/lib/calls";
import { getConversation } from "@/lib/chat";
import { isCallingConfigured } from "@/lib/env";
import { getCurrentUserId } from "@/lib/profiles";
import { CallRoom } from "./CallRoom";

export const metadata: Metadata = { title: "Call" };

export default async function CallPage({ params }: PageProps<"/calls/[id]">) {
  const { id } = await params;
  const me = await getCurrentUserId();
  if (!me) redirect(`/login?next=/calls/${id}`);
  const call = await getCall(id);
  if (!call) notFound();
  const chat = await getConversation(call.conversation_id);
  if (!chat) notFound();

  const others = chat.members.filter((m) => m.id !== me);
  const title = chat.conversation.is_group
    ? (chat.conversation.title ?? "Group call")
    : (others[0]?.display_name ?? "Call");

  if (!isCallingConfigured) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Calls aren&apos;t set up yet</h1>
        <p className="mt-2 text-muted">
          Add your LiveKit keys (<code>LIVEKIT_URL</code>, <code>LIVEKIT_API_KEY</code>, <code>LIVEKIT_API_SECRET</code>) to
          the server settings to turn on voice and video calls. See the README.
        </p>
        <Link href={`/messages/${call.conversation_id}`} className="mt-6 inline-block font-medium text-brand hover:underline">
          Back to chat
        </Link>
      </main>
    );
  }

  return (
    <CallRoom
      callId={call.id}
      kind={call.kind}
      initialStatus={call.status}
      isCaller={call.started_by === me}
      isGroup={chat.conversation.is_group}
      title={title}
      avatarUrl={chat.conversation.is_group ? null : (others[0]?.avatar_url ?? null)}
      chatHref={`/messages/${call.conversation_id}`}
    />
  );
}
