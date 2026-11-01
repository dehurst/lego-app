"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/supabase/config";

/** Supabase client for the browser (login/logout). Stores the session in cookies. */
export function createBrowserSupabase() {
  return createBrowserClient(publicSupabaseUrl(), publicSupabaseKey());
}
