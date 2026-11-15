"use server";

import { refresh } from "next/cache";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Called when the inbox is opened: everything up to now counts as read. */
export async function markAlertsSeen(): Promise<void> {
  const user = await getApprovedUser();
  if (!user) return;
  await createAdminClient()
    .from("profiles")
    .update({ alerts_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}

/** Hide one alert from the inbox. Only ever touches your own alerts. */
export async function dismissAlert(formData: FormData): Promise<void> {
  const user = await getApprovedUser();
  const id = Number(formData.get("id"));
  if (!user || !Number.isInteger(id)) return;
  await createAdminClient()
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  refresh();
}

/** Hide every alert currently in your inbox. */
export async function dismissAllAlerts(): Promise<void> {
  const user = await getApprovedUser();
  if (!user) return;
  await createAdminClient()
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("dismissed_at", null);
  refresh();
}
