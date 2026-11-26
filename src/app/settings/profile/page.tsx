import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { getMyProfile } from "@/lib/profiles";

export const metadata: Metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login?next=/settings/profile");
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Edit profile</h1>
        <Link href={`/u/${profile.username}`} className="text-sm font-medium text-brand hover:underline">
          View profile
        </Link>
      </div>
      <ProfileForm
        mode="settings"
        userId={userId}
        initial={{
          username: profile.username,
          displayName: profile.display_name,
          bio: profile.bio,
          avatarUrl: profile.avatar_url,
        }}
      />
    </main>
  );
}
