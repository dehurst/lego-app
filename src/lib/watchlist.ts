import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** The set numbers this person is watching (to show ★ on set cards). */
export async function watchedSetNums(userId: string): Promise<Set<string>> {
  const { data } = await createAdminClient()
    .from("watchlist_items")
    .select("set_num")
    .eq("user_id", userId)
    .limit(1000);
  return new Set((data ?? []).map((r) => r.set_num as string));
}
