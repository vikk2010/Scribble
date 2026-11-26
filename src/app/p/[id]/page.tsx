import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PostCard, timeAgo } from "@/components/PostCard";
import { getPostWithComments } from "@/lib/posts";
import { getCurrentUserId } from "@/lib/profiles";
import { CommentForm } from "./CommentForm";

export const metadata: Metadata = { title: "Post" };

export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const viewerId = await getCurrentUserId();
  const result = await getPostWithComments(id, viewerId);
  if (!result) notFound();
  const { post, comments } = result;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm font-medium text-brand hover:underline">
        ← Back to home
      </Link>
      <div className="mt-4">
        <PostCard post={post} signedIn={Boolean(viewerId)} />
      </div>

      <section aria-labelledby="comments" className="mt-6 flex flex-col gap-4">
        <h2 id="comments" className="font-semibold">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h2>
        {viewerId ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="text-sm text-muted">
            <Link href={`/login?next=/p/${post.id}`} className="font-medium text-brand hover:underline">
              Log in
            </Link>{" "}
            to join the conversation.
          </p>
        )}
        <ul className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author?.display_name ?? "?"} url={c.author?.avatar_url ?? null} size={32} />
              <div className="min-w-0 flex-1 rounded-2xl bg-surface px-4 py-2.5">
                <p className="text-sm">
                  {c.author ? (
                    <Link href={`/u/${c.author.username}`} className="font-semibold hover:underline">
                      {c.author.display_name}
                    </Link>
                  ) : (
                    <span className="font-semibold">Deleted user</span>
                  )}{" "}
                  <span className="text-muted">· {timeAgo(c.created_at)}</span>
                </p>
                <p className="whitespace-pre-line">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
