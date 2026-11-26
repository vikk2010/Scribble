import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { getMyProfile } from "@/lib/profiles";

export const metadata: Metadata = { title: "Create your profile" };

export default async function OnboardingPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login?next=/onboarding");
  if (profile) redirect(`/u/${profile.username}`);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Create your profile</h1>
      <p className="mb-8 mt-1 text-sm text-muted">This is how friends will find you on Scribble.</p>
      <ProfileForm mode="onboarding" userId={userId} />
    </main>
  );
}
