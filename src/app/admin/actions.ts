"use server";

import { refresh } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { newInviteCode, newTempPassword } from "@/lib/secrets";
import { createAdminClient } from "@/lib/supabase/admin";

// Every action re-checks that the caller is an admin. Hiding buttons in the
// page is just convenience — THIS check is the actual security.
async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Admins only.");
  return admin;
}

function idFrom(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Bad id.");
  return id;
}

export async function approveUser(formData: FormData) {
  await requireAdmin();
  await createAdminClient()
    .from("profiles")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", idFrom(formData))
    .eq("status", "pending");
  refresh();
}

/** Deny a pending signup, or remove an existing person. Deletes everything of theirs. */
export async function removeUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = idFrom(formData);
  if (id === admin.id) throw new Error("You can't remove yourself.");
  // Deleting the login cascades to their profile and devices.
  await createAdminClient().auth.admin.deleteUser(id);
  refresh();
}

export async function createInvite() {
  const admin = await requireAdmin();
  await createAdminClient()
    .from("invite_codes")
    .insert({ code: newInviteCode(), created_by: admin.id });
  refresh();
}

export async function deleteInvite(formData: FormData) {
  await requireAdmin();
  await createAdminClient()
    .from("invite_codes")
    .delete()
    .eq("id", idFrom(formData))
    .is("used_at", null);
  refresh();
}

export type ResetState = { password: string } | { error: string } | undefined;

/** Sets a new random password and returns it ONCE so the admin can pass it on. */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireAdmin();
  const password = newTempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(idFrom(formData), {
    password,
  });
  if (error) return { error: error.message };
  return { password };
}

export type SyncState =
  | { ok: true; summary: string }
  | { ok: false; error: string }
  | undefined;

/** Pull the latest themes + sets from Rebrickable right now. */
export async function syncCatalogNow(): Promise<SyncState> {
  await requireAdmin();
  // Imported here so the admin page doesn't load sync code until it's used.
  const { syncCatalog } = await import("@/lib/catalog/sync");
  try {
    const r = await syncCatalog();
    refresh();
    return {
      ok: true,
      summary:
        `${r.sets} sets in ${r.seconds}s. ` +
        (r.firstSync
          ? "First sync: catalog loaded (no alerts for these)."
          : `${r.newSetNums.length} new since last sync.`),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
