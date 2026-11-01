import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseKey, publicSupabaseUrl } from "@/lib/supabase/config";

/**
 * A Supabase client that acts AS the logged-in person, using the session
 * stored in their cookies. Create a new one per request.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(publicSupabaseUrl(), publicSupabaseKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Pages can't set cookies while rendering. That's fine: the proxy
          // (src/proxy.ts) refreshes the session on every request anyway.
        }
      },
    },
  });
}
