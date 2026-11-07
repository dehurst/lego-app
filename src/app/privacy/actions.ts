"use server";

import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes the logged-in person's account and everything tied to it
 * (profile, devices, follows, watchlist, alerts — all via cascades).
 */
export async function deleteMyAccount(): Promise<DeleteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're not logged in." };

  const db = createAdminClient();
  if (user.role === "admin") {
    // Don't let the last admin lock everyone out of approvals and invites.
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "You're the only admin, so this account can't be deleted here." };
    }
  }

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "Couldn't delete the account. Please try again." };
  return { ok: true };
}
