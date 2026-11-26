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
    <main className="bg-hero-glow flex w-full flex-1 flex-col justify-center px-6 py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">
            Welcome to <span className="text-brand-gradient">Scribble</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Log in or sign up with your {phoneAuthEnabled ? "email or phone number" : "email"}.
          </p>
        </div>
        <LoginForm phoneEnabled={phoneAuthEnabled} next={next} />
      </div>
    </main>
  );
}
