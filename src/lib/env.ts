export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const phoneAuthEnabled = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/** LiveKit powers voice and video calls. Server-only secrets; never expose them to the browser. */
export const livekitUrl = process.env.LIVEKIT_URL ?? "";
export const isCallingConfigured = Boolean(
  process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET,
);
