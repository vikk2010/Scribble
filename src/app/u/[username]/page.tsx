import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const isMe = viewerId === profile.id;
  const joined = new Date(profile.created_at).toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <section className="flex items-start gap-6">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="96px" className="object-cover" priority />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl font-semibold text-neutral-500">
              {profile.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
              <p className="text-neutral-500">@{profile.username}</p>
            </div>
            {isMe ? (
              <Link href="/settings/profile" className={secondaryButton}>
                Edit profile
              </Link>
            ) : null}
          </div>
          {profile.bio ? <p className="mt-3 whitespace-pre-line">{profile.bio}</p> : null}
          <p className="mt-3 text-sm text-neutral-500">Joined {joined}</p>
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
        No posts yet.
      </section>
    </main>
  );
}
