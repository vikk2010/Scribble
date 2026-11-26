import Link from "next/link";
import { redirect } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { getLatestPostsShuffled } from "@/lib/posts";
import { getMyProfile } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/env";
import { primaryButton, secondaryButton } from "@/lib/ui";

export default async function Home() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const [{ userId, profile }, posts] = await Promise.all([getMyProfile(), getLatestPostsShuffled()]);
  if (userId && !profile) redirect("/onboarding");

  return (
    <main className="flex-1">
      {profile ? null : (
        <section className="bg-hero-glow border-b border-border">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-6 py-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Share moments. <span className="text-brand-gradient">Stay close.</span>
            </h1>
            <p className="max-w-md text-lg text-muted">
              Post photos and thoughts for the world, find groups you love, and chat with your friends.
            </p>
            <div className="flex gap-3">
              <Link href="/login" className={primaryButton}>
                Join Scribble
              </Link>
              <a href="#latest" className={`${secondaryButton} !py-2.5 !text-base`}>
                See what&apos;s new
              </a>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
        {profile && userId ? (
          <PostComposer userId={userId} name={profile.display_name} avatarUrl={profile.avatar_url} />
        ) : null}
        <h2 id="latest" className="mt-2 text-lg font-semibold">
          Latest posts
        </h2>
        {posts.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
            No posts yet. {profile ? "Write the first one above." : "Join to write the first one."}
          </p>
        )}
      </div>
    </main>
  );
}

function SetupNotice() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Almost there</h1>
      <p className="mt-2 text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code> and add your Supabase URL and publishable key,
        then restart the dev server. See the README for the full setup.
      </p>
    </main>
  );
}
