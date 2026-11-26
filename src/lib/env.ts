export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const phoneAuthEnabled = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
