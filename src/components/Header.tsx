import Link from "next/link";
import { signOut } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { getMyProfile } from "@/lib/profiles";
import { isSupabaseConfigured } from "@/lib/env";
import { primaryButton } from "@/lib/ui";

const NAV = [
  { href: "/", label: "Home", icon: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/groups", label: "Groups", icon: "M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8" },
  { href: "/friends", label: "Friends", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" },
  { href: "/messages", label: "Messages", icon: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" },
];

export async function Header() {
  const { userId, profile } = isSupabaseConfigured
    ? await getMyProfile()
    : { userId: null, profile: null };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div aria-hidden className="h-1 bg-brand-gradient" />
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-brand-gradient text-xl font-extrabold tracking-tight">
            Scribble
          </Link>
          <div className="flex items-center gap-4 text-sm sm:gap-5">
            {userId ? (
              <>
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="hidden font-medium hover:text-brand sm:inline">
                    {item.label}
                  </Link>
                ))}
                {profile ? (
                  <Link href={`/u/${profile.username}`} className="flex items-center gap-2 font-medium hover:text-brand">
                    <Avatar name={profile.display_name} url={profile.avatar_url} size={28} />
                    <span className="hidden md:inline">@{profile.username}</span>
                    <span className="sr-only md:hidden">Your profile</span>
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
      {userId ? (
        <nav
          aria-label="Main (mobile)"
          className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-4 border-t border-border bg-background/95 backdrop-blur sm:hidden"
        >
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-0.5 text-xs font-medium hover:text-brand">
              <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}
