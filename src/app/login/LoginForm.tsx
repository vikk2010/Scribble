"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailSchema, otpSchema, phoneSchema } from "@/lib/validation";
import { inputClass, primaryButton } from "@/lib/ui";

type Method = "email" | "phone";

export function LoginForm({ phoneEnabled, next }: { phoneEnabled: boolean; next: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [identifier, setIdentifier] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = method === "email" ? emailSchema.safeParse(identifier.trim()) : phoneSchema.safeParse(identifier);
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setBusy(true);
    const supabase = createClient();
    const { error } =
      method === "email"
        ? await supabase.auth.signInWithOtp({ email: parsed.data })
        : await supabase.auth.signInWithOtp({ phone: parsed.data });
    setBusy(false);
    if (error) return setError(error.message);
    setSentTo(parsed.data);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success || !sentTo) return setError(parsed.error?.issues[0].message ?? "Enter the code.");

    setBusy(true);
    const supabase = createClient();
    const { error } =
      method === "email"
        ? await supabase.auth.verifyOtp({ email: sentTo, token: parsed.data, type: "email" })
        : await supabase.auth.verifyOtp({ phone: sentTo, token: parsed.data, type: "sms" });
    setBusy(false);
    if (error) return setError("That code is wrong or has expired.");
    router.replace(next);
    router.refresh();
  }

  if (sentTo) {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          We sent a code to <strong>{sentTo}</strong>. Enter it below.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={8}
          className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
          autoFocus
        />
        {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setCode("");
            setError(null);
          }}
          className="text-sm text-muted hover:underline"
        >
          Use a different {method === "email" ? "email" : "number"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-4">
      {phoneEnabled ? (
        <div role="tablist" className="grid grid-cols-2 rounded-full bg-surface p-1 text-sm">
          {(["email", "phone"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              onClick={() => {
                setMethod(m);
                setIdentifier("");
                setError(null);
              }}
              className={`rounded-full py-1.5 font-medium ${method === m ? "bg-background shadow text-brand" : "text-muted"}`}
            >
              {m === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{method === "email" ? "Email address" : "Phone number"}</span>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          type={method === "email" ? "email" : "tel"}
          autoComplete={method === "email" ? "email" : "tel"}
          placeholder={method === "email" ? "you@example.com" : "+91 98765 43210"}
          className={inputClass}
          autoFocus
          required
        />
      </label>
      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Sending…" : "Send code"}
      </button>
      <p className="text-center text-xs text-muted">
        New here? The same code creates your account.
      </p>
    </form>
  );
}
