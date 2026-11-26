import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { Post } from "@/lib/posts";
import { card } from "@/lib/ui";

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short" });
}

export function PostCard({ post }: { post: Post }) {
  const author = post.author;
  return (
    <article className={`${card} overflow-hidden`}>
      <header className="flex items-center gap-3 p-4">
        <Avatar name={author?.display_name ?? "?"} url={author?.avatar_url ?? null} size={40} />
        <div className="min-w-0 leading-tight">
          {author ? (
            <Link href={`/u/${author.username}`} className="font-semibold hover:underline">
              {author.display_name}
            </Link>
          ) : (
            <span className="font-semibold">Deleted user</span>
          )}
          <p className="text-sm text-muted">
            {author ? `@${author.username} · ` : ""}
            <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
          </p>
        </div>
      </header>
      {post.body ? <p className="whitespace-pre-line px-4 pb-4">{post.body}</p> : null}
      {post.image_url ? (
        <div className="relative aspect-[4/3] w-full bg-surface">
          <Image src={post.image_url} alt={post.body ? post.body.slice(0, 100) : "Photo"} fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" />
        </div>
      ) : null}
    </article>
  );
}
