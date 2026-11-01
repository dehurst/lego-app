import { getApprovedUser } from "@/lib/auth";
import { sendPush, type StoredSubscription } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_DELAY_SECONDS = 15;

// POST /api/push/test: send a test notification to the device that asked.
// Optional delay gives you time to lock the phone first.
export async function POST(request: Request) {
  const user = await getApprovedUser();
  if (!user) {
    return Response.json({ error: "Please log in (and be approved) first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    endpoint?: unknown;
    delaySeconds?: unknown;
  };
  if (typeof body.endpoint !== "string") {
    return Response.json({ error: "Missing endpoint." }, { status: 400 });
  }

  const { data: sub } = await createAdminClient()
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count")
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id) // you can only test your own devices
    .maybeSingle<StoredSubscription>();

  if (!sub) {
    // The client re-registers when it sees this.
    return Response.json({ error: "This device isn't registered." }, { status: 404 });
  }

  const delay = Math.min(Math.max(Number(body.delaySeconds) || 0, 0), MAX_DELAY_SECONDS);
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay * 1000));

  const outcome = await sendPush(sub, {
    title: "🧱 Brick Drop test",
    body: `Hi ${user.username}! It works. Sent at ${new Date().toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })}.`,
    url: "/",
    tag: "test",
  });

  return Response.json(outcome, { status: outcome.status === "sent" ? 200 : 502 });
}
