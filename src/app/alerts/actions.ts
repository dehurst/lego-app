"use server";

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
