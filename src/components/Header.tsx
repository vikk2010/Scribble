import Link from "next/link";
import { signOut } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { getMyProfile } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/env";
import { primaryButton } from "@/lib/ui";

export async function Header() {
  const { userId, profile } = isSupabaseConfigured
    ? await getMyProfile()
    : { userId: null, profile: null };

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div aria-hidden className="h-1 bg-brand-gradient" />
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-brand-gradient text-xl font-extrabold tracking-tight">
          Scribble
        </Link>
        <div className="flex items-center gap-5 text-sm">
          {userId ? (
            <>
              <Link href="/" className="font-medium hover:text-brand">
                Home
              </Link>
              <Link href="/groups" className="font-medium hover:text-brand">
                Groups
              </Link>
              {profile ? (
                <Link href={`/u/${profile.username}`} className="flex items-center gap-2 font-medium hover:text-brand">
                  <Avatar name={profile.display_name} url={profile.avatar_url} size={28} />
                  <span className="hidden sm:inline">@{profile.username}</span>
                </Link>
              ) : (
                <Link href="/onboarding" className="font-medium hover:underline">
                  Finish your profile
                </Link>
              )}
              <form action={signOut}>
                <button type="submit" className="text-muted hover:underline">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className={`${primaryButton} !px-4 !py-1.5 text-sm`}>
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
