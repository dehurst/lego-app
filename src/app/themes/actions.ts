"use server";

import { refresh } from "next/cache";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Follow or unfollow a top-level theme for the logged-in person. */
export async function setFollow(themeId: number, follow: boolean): Promise<{ ok: boolean }> {
  const user = await getApprovedUser();
  if (!user || !Number.isInteger(themeId)) return { ok: false };
  const db = createAdminClient();

  if (follow) {
    // Only real, visible, top-level themes can be followed.
    const { data: theme } = await db
      .from("themes")
      .select("id")
      .eq("id", themeId)
      .eq("hidden", false)
      .filter("root_id", "eq", themeId)
      .maybeSingle();
    if (!theme) return { ok: false };
    await db
      .from("theme_follows")
      .upsert({ user_id: user.id, theme_id: themeId }, { onConflict: "user_id,theme_id" });
  } else {
    await db.from("theme_follows").delete().eq("user_id", user.id).eq("theme_id", themeId);
  }
  refresh();
  return { ok: true };
}
