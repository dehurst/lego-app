// Public Supabase settings. Safe for the browser: the URL and publishable
// (anon) key are designed to be public; Row Level Security protects data.
//
// `process.env.NEXT_PUBLIC_...` must be written out literally so Next.js can
// paste the values into the browser bundle at build time.

export function publicSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. See .env.example.");
  // Strip any path (e.g. "/rest/v1/") that was pasted from the dashboard.
  return new URL(raw).origin;
}

export function publicSupabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.");
  return key;
}
