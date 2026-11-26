import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { phoneAuthEnabled } from "@/lib/env";
import { getCurrentUserId } from "@/lib/profiles";

export const metadata: Metadata = { title: "Log in or sign up" };

function safeNext(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUserId()) redirect(next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome to Scribble</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Log in or sign up with your {phoneAuthEnabled ? "email or phone number" : "email"}.
        </p>
      </div>
      <LoginForm phoneEnabled={phoneAuthEnabled} next={next} />
    </main>
  );
}
