import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** How many alerts this person got since they last opened the inbox. */
export async function unreadAlertCount(userId: string): Promise<number> {
  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("alerts_seen_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return 0;
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sent")
    .gt("sent_at", profile.alerts_seen_at);
  return count ?? 0;
}
