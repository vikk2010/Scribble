import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { getPostsByAuthor } from "@/lib/posts";
import { getCurrentUserId, getProfileByUsername } from "@/lib/profiles";
import { secondaryButton } from "@/lib/ui";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const profile = await getProfileByUsername((await params).username);
  if (!profile) return { title: "Profile not found" };
  return {
    title: `${profile.display_name} (@${profile.username})`,
    description: profile.bio || `${profile.display_name} is on Scribble.`,
  };
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const [profile, viewerId] = await Promise.all([getProfileByUsername(username), getCurrentUserId()]);
  if (!profile) notFound();
  const posts = await getPostsByAuthor(profile.id, viewerId);
  const isMe = viewerId === profile.id;
  const joined = new Date(profile.created_at).toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <main className="flex-1">
      <div aria-hidden className="bg-hero-glow h-28 border-b border-border" />
      <div className="mx-auto w-full max-w-xl px-4">
        <section className="-mt-12 flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <Avatar name={profile.display_name} url={profile.avatar_url} size={96} className="ring-4 ring-background" />
            {isMe ? (
              <Link href="/settings/profile" className={secondaryButton}>
                Edit profile
              </Link>
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
            <p className="text-muted">@{profile.username}</p>
            {profile.bio ? <p className="mt-3 whitespace-pre-line">{profile.bio}</p> : null}
            <p className="mt-3 text-sm text-muted">
              Joined {joined} · {posts.length} {posts.length === 1 ? "post" : "posts"}
            </p>
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-4 pb-12">
          {posts.length ? (
            posts.map((post) => <PostCard key={post.id} post={post} signedIn={Boolean(viewerId)} />)
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">No posts yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
