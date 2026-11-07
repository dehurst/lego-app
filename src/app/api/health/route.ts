import { connection } from "next/server";
import { APP_TIMEZONE, optionalEnv } from "@/lib/env";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// GET /api/health — a quick "is everything wired up?" check.
// Useful after each deploy: open it on your phone and look for "ok": true.
// It only says WHETHER each setting exists, never its value.
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

  const has = (name: string) => Boolean(optionalEnv(name));
  const settings = {
    push: has("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && has("VAPID_PRIVATE_KEY") && has("VAPID_SUBJECT"),
    rebrickable: has("REBRICKABLE_API_KEY"),
    brickset: has("BRICKSET_API_KEY"), // optional
    hourlyCheck: has("CRON_SECRET"),
  };
  const warnings = [
    ...(has("ADMIN_SECRET")
      ? ["ADMIN_SECRET is still set. Delete it in Vercel once your admin account exists."]
      : []),
    ...(!settings.brickset ? ["No BRICKSET_API_KEY: sets won't show on sale / coming soon."] : []),
  ];

  const now = new Date().toLocaleString("en-US", { timeZone: APP_TIMEZONE });

  return Response.json({
    ok: supabase === "connected" && settings.push && settings.rebrickable && settings.hourlyCheck,
    app: "Brick Drop",
    serverTime: `${now} (${APP_TIMEZONE})`,
    supabase,
    settings,
    warnings,
  });
}
