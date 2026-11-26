import Link from "next/link";
import { signOut } from "@/app/actions/profile";
import { getMyProfile } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/env";

export async function Header() {
  const { userId, profile } = isSupabaseConfigured
    ? await getMyProfile()
    : { userId: null, profile: null };

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-violet-600">
          Scribble
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {userId ? (
            <>
              <Link href={profile ? `/u/${profile.username}` : "/onboarding"} className="font-medium hover:underline">
                {profile ? `@${profile.username}` : "Finish your profile"}
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-neutral-500 hover:underline">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-violet-600 px-4 py-1.5 font-medium text-white hover:bg-violet-700">
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
