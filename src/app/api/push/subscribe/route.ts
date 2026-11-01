import { getApprovedUser, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type SubscribeBody = {
  subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  deviceLabel?: unknown;
};

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function notAllowed(): Response {
  return Response.json({ error: "Please log in (and be approved) first." }, { status: 401 });
}

// POST /api/push/subscribe: save (or refresh) this device's subscription
// for the logged-in person.
export async function POST(request: Request) {
  const user = await getApprovedUser();
  if (!user) return notAllowed();

  const body = (await request.json().catch(() => ({}))) as SubscribeBody;
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;

  // Never trust what the browser sends: check shapes before saving.
  if (!isHttpsUrl(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
    return Response.json({ error: "Invalid subscription." }, { status: 400 });
  }
  const deviceLabel =
    typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 60) : null;

  // "Upsert" = insert, or update if this endpoint is already saved. So
  // re-tapping the button or re-syncing on app open never makes duplicates.
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        endpoint,
        // If someone else used to be logged in on this device, the device
        // now belongs to whoever is logged in.
        user_id: user.id,
        p256dh,
        auth,
        device_label: deviceLabel,
        user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    console.error("Saving subscription failed", error);
    return Response.json({ error: "Could not save subscription." }, { status: 500 });
  }
  return Response.json({ ok: true });
}

// DELETE /api/push/subscribe: forget this device (when alerts are turned off).
export async function DELETE(request: Request) {
  // Pending users may delete too (e.g. when logging out).
  const user = await getCurrentUser();
  if (!user) return notAllowed();

  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
  if (!isHttpsUrl(endpoint)) {
    return Response.json({ error: "Invalid endpoint." }, { status: 400 });
  }
  // Only ever delete your OWN device.
  await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  return Response.json({ ok: true });
}
