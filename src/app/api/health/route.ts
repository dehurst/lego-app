import { connection } from "next/server";
import { APP_TIMEZONE } from "@/lib/env";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// GET /api/health — a quick "is everything wired up?" check.
// Useful after each deploy: open it on your phone and look for "ok": true.
export async function GET() {
  await connection(); // run on every request, never cache

  let supabase: "not configured" | "connected" | string = "not configured";
  if (isSupabaseConfigured()) {
    // listUsers needs no tables, so this works on a brand-new project.
    const { error } = await createAdminClient().auth.admin.listUsers({
      perPage: 1,
    });
    supabase = error ? `error: ${error.message}` : "connected";
  }

  const now = new Date().toLocaleString("en-US", { timeZone: APP_TIMEZONE });

  return Response.json({
    ok: supabase === "connected",
    app: "Brick Drop",
    serverTime: `${now} (${APP_TIMEZONE})`,
    supabase,
  });
}
