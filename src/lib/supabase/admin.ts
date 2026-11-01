import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { optionalEnv, requireEnv } from "@/lib/env";

// The "service role" key bypasses Row Level Security, so it must only ever
// run on the server. The `server-only` import above makes the build fail if
// a browser component ever imports this file by mistake.

export function isSupabaseConfigured(): boolean {
  return Boolean(
    optionalEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      optionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

/**
 * The project URL, reduced to just "https://<project>.supabase.co".
 * Supabase's dashboard also shows URLs like ".../rest/v1/"; if one of those
 * gets pasted in, every request fails with "Invalid path specified".
 */
export function supabaseUrl(): string {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).origin;
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    supabaseUrl(),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
