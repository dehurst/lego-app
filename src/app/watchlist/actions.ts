"use server";

import { refresh } from "next/cache";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Watch or stop watching one set for the logged-in person. */
export async function setWatch(setNum: string, watch: boolean): Promise<{ ok: boolean }> {
  const user = await getApprovedUser();
  if (!user || typeof setNum !== "string" || setNum.length > 40) return { ok: false };
  const db = createAdminClient();

  if (watch) {
    // The foreign key rejects set numbers that don't exist.
    const { error } = await db
      .from("watchlist_items")
      .upsert({ user_id: user.id, set_num: setNum }, { onConflict: "user_id,set_num" });
    if (error) return { ok: false };
  } else {
    await db.from("watchlist_items").delete().eq("user_id", user.id).eq("set_num", setNum);
  }
  refresh();
  return { ok: true };
}
