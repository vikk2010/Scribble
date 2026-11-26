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
