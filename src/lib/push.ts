import "server-only";
import webpush, { WebPushError } from "web-push";
import { requireEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** What the service worker (public/sw.js) expects inside each push. */
export type PushPayload = {
  title: string;
  body: string;
  url?: string; // where tapping the notification goes
  tag?: string; // same tag replaces an older notification
  icon?: string;
};

export type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
};

export type SendOutcome =
  | { status: "sent" }
  | { status: "expired" } // device unsubscribed; row deleted
  | { status: "failed"; error: string };

let configured = false;
function configure() {
  if (configured) return;
  // VAPID = our app's signature. Apple/Google check it before delivering.
  webpush.setVapidDetails(
    requireEnv("VAPID_SUBJECT"),
    requireEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    requireEnv("VAPID_PRIVATE_KEY"),
  );
  configured = true;
}

/**
 * Sends one push to one device and keeps the database tidy:
 * - success → record last_success_at
 * - 404/410 → the device is gone (app deleted, permission revoked) → delete row
 * - anything else → count the failure (could be our config, so don't delete)
 */
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<SendOutcome> {
  configure();
  const db = createAdminClient();

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24, // if the phone is offline, keep trying for a day
        urgency: "high",
      },
    );
    await db
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
      .eq("id", sub.id);
    return { status: "sent" };
  } catch (err) {
    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
      await db.from("push_subscriptions").delete().eq("id", sub.id);
      return { status: "expired" };
    }
    await db
      .from("push_subscriptions")
      .update({ failure_count: sub.failure_count + 1 })
      .eq("id", sub.id);
    const error =
      err instanceof WebPushError
        ? `${err.statusCode} ${err.body || err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    console.error("Push failed", sub.endpoint.slice(0, 60), error);
    return { status: "failed", error };
  }
}
