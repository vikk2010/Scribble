import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/env";
import { primaryButton } from "@/lib/ui";

export default async function Home() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const { userId, profile } = await getMyProfile();
  if (userId && !profile) redirect("/onboarding");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Share moments. <span className="text-violet-600">Stay close.</span>
      </h1>
      <p className="max-w-md text-lg text-neutral-600 dark:text-neutral-400">
        Post photos, thoughts and short videos for the world, and chat or call with your friends.
      </p>
      {profile ? (
        <Link href={`/u/${profile.username}`} className={primaryButton}>
          Go to your profile
        </Link>
      ) : (
        <Link href="/login" className={primaryButton}>
          Get started
        </Link>
      )}
      <p className="text-sm text-neutral-500">The public feed is coming in the next phase.</p>
    </main>
  );
}

function SetupNotice() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Almost there</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Copy <code>.env.example</code> to <code>.env.local</code> and add your Supabase URL and publishable key,
        then restart the dev server. See the README for the full setup.
      </p>
    </main>
  );
}
