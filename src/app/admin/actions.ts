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

export type CheckState = { ok: true; summary: string } | { ok: false; error: string } | undefined;

async function runCheckAndSummarize(prefix = "", forceBrickset = false): Promise<CheckState> {
  const { runHourlyCheck } = await import("@/lib/alerts/hourly");
  try {
    // force: send even during quiet hours, since an admin is testing.
    const r = await runHourlyCheck({ force: true, forceBrickset });
    refresh();
    const d = r.delivery;
    const b = r.brickset;
    const bricksetText = b.ran
      ? `Brickset: ${b.fetched} sets in ${b.calls} call(s); ${r.nowAvailable} just went on sale. ` +
        (forceBrickset ? `Fields seen: ${b.sampleFields.join(", ")}. ` : "")
      : `Brickset skipped (${b.reason}). `;
    return {
      ok: true,
      summary:
        prefix +
        `Synced ${r.sync.sets} sets in ${r.sync.seconds}s` +
        (r.sync.firstSync
          ? " (first sync: catalog loaded quietly, no alerts). "
          : `, ${r.sync.newSets} new. `) +
        bricksetText +
        `Queued ${r.queued} alert(s). ` +
        (d.alerts
          ? `Sent ${d.alerts} alert(s) to ${d.people} person(s), reaching ${d.pushesSent} device(s).` +
            (d.devicesExpired ? ` Removed ${d.devicesExpired} expired device(s).` : "") +
            (d.pushFailures ? ` ${d.pushFailures} push(es) failed.` : "")
          : "Nothing to send."),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Run the full hourly job right now (sync → queue → send). */
export async function runCheckNow(): Promise<CheckState> {
  await requireAdmin();
  return runCheckAndSummarize();
}

/**
 * Run the hourly job AND fetch from Brickset even if it ran recently.
 * Shows the field names Brickset returned, to confirm we read them right.
 * Uses a few of Brickset's daily calls, so don't tap it repeatedly.
 */
export async function fetchBricksetNow(): Promise<CheckState> {
  await requireAdmin();
  return runCheckAndSummarize("", true);
}

/**
 * TESTING: forget the newest set in a theme, then run the hourly check.
 * The sync finds it again, treats it as brand new, and alerts followers.
 * Safe: the set comes right back from Rebrickable.
 */
export async function simulateNewSet(_prev: CheckState, formData: FormData): Promise<CheckState> {
  await requireAdmin();
  const themeId = Number(formData.get("themeId"));
  if (!Number.isInteger(themeId)) return { ok: false, error: "Pick a theme." };

  const db = createAdminClient();
  const { data: newest } = await db
    .from("sets")
    .select("set_num, name")
    .eq("root_theme_id", themeId)
    .order("year", { ascending: false })
    .order("set_num", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!newest) return { ok: false, error: "That theme has no sets yet." };

  // Deleting the set also deletes old alerts about it (cascade), so the
  // "one alert per set per person" rule lets it be sent again.
  await db.from("sets").delete().eq("set_num", newest.set_num);
  return runCheckAndSummarize(`Pretended "${newest.name}" was new. `);
}
