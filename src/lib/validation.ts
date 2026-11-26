import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Use 3 to 20 letters, numbers or underscores.");

export const profileSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Enter a name.").max(50, "Keep it under 50 characters."),
  bio: z.string().trim().max(160, "Keep your bio under 160 characters.").default(""),
});

export const emailSchema = z.email("Enter a valid email address.");

/** E.164 phone number, e.g. +919876543210. */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Use international format, e.g. +919876543210."));

export const otpSchema = z.string().trim().regex(/^\d{6,8}$/, "Enter the code we sent you.");

export type ProfileInput = z.infer<typeof profileSchema>;

export const postSchema = z.object({
  body: z.string().trim().max(500, "Posts can be up to 500 characters."),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(300, "Comments can be up to 300 characters."),
});

export const MAX_VIDEO_SECONDS = 60;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const groupSchema = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters.").max(50, "Keep it under 50 characters."),
  description: z.string().trim().max(300, "Keep it under 300 characters.").default(""),
});

/** "Delhi Cricket Fans!" -> "delhi-cricket-fans" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/** Keeps a search term safe for a PostgREST ilike filter. */
export function cleanSearchTerm(q: string): string {
  return q.replace(/[%_\\,()"'.*:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Unbiased in-place shuffle (Fisher-Yates); returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
