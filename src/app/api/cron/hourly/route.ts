import { runHourlyCheck } from "@/lib/alerts/hourly";
import { optionalEnv } from "@/lib/env";
import { safeEqual } from "@/lib/secrets";

// Usually ~10 seconds; a Brickset fetch (every 6 hours) adds up to ~30.
export const maxDuration = 120;

// Called every hour by Supabase's scheduler (pg_cron). Protected by
// CRON_SECRET so nobody else can trigger it.
async function handle(request: Request) {
  const secret = optionalEnv("CRON_SECRET");
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runHourlyCheck();
    console.log("Hourly check", JSON.stringify(result));
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Hourly check failed", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
