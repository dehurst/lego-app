import "server-only";
import { sendPush, type StoredSubscription } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { unreadAlertCount } from "./inbox";
import { buildAlertMessage, type AlertItem, type AlertKind } from "./message";
import { isQuietHours } from "./quiet-hours";

const CHUNK = 300;

/**
 * Step 1: record an alert of `kind` for every follower of each set's theme.
 * Duplicates are silently skipped (unique per person + set + kind).
 */
export async function queueAlerts(setNums: string[], kind: AlertKind): Promise<number> {
  if (setNums.length === 0) return 0;
  const db = createAdminClient();

  const sets: { set_num: string; root_theme_id: number }[] = [];
  for (let i = 0; i < setNums.length; i += CHUNK) {
    const { data, error } = await db
      .from("sets")
      .select("set_num, root_theme_id")
      .in("set_num", setNums.slice(i, i + CHUNK));
    if (error) throw new Error(`Reading new sets: ${error.message}`);
    sets.push(...(data ?? []));
  }

  const themeIds = [...new Set(sets.map((s) => s.root_theme_id))];
  const { data: follows, error } = await db
    .from("theme_follows")
    .select("user_id, theme_id, profiles!inner(status)")
    .in("theme_id", themeIds)
    .eq("profiles.status", "approved");
  if (error) throw new Error(`Reading follows: ${error.message}`);

  const followersByTheme = new Map<number, string[]>();
  for (const f of follows ?? []) {
    followersByTheme.set(f.theme_id, [...(followersByTheme.get(f.theme_id) ?? []), f.user_id]);
  }

  // People watching a specific set also hear when it goes on sale, even if
  // they don't follow its theme. (A brand-new set can't be watched yet.)
  const watchersBySet = new Map<string, string[]>();
  if (kind !== "new_set") {
    for (let i = 0; i < sets.length; i += CHUNK) {
      const { data: watches, error: watchError } = await db
        .from("watchlist_items")
        .select("user_id, set_num, profiles!inner(status)")
        .in("set_num", sets.slice(i, i + CHUNK).map((s) => s.set_num))
        .eq("profiles.status", "approved");
      if (watchError) throw new Error(`Reading watchlists: ${watchError.message}`);
      for (const w of watches ?? []) {
        watchersBySet.set(w.set_num, [...(watchersBySet.get(w.set_num) ?? []), w.user_id]);
      }
    }
  }

  // A Set removes duplicates: following the theme AND watching the set
  // still means one alert.
  const rows = sets.flatMap((s) =>
    [
      ...new Set([
        ...(followersByTheme.get(s.root_theme_id) ?? []),
        ...(watchersBySet.get(s.set_num) ?? []),
      ]),
    ].map((userId) => ({ user_id: userId, set_num: s.set_num, kind })),
  );

  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error: insertError } = await db
      .from("notifications")
      .upsert(rows.slice(i, i + CHUNK), {
        onConflict: "user_id,set_num,kind",
        ignoreDuplicates: true,
      });
    if (insertError) throw new Error(`Queueing alerts: ${insertError.message}`);
  }
  return rows.length;
}

export type DeliveryResult = {
  quietHours: boolean;
  people: number;
  alerts: number;
  pushesSent: number;
  devicesExpired: number;
  pushFailures: number;
};

/**
 * Step 2: send what's pending, one notification per person.
 * Skipped during quiet hours unless `force` (admin testing).
 */
export async function deliverPendingAlerts({ force = false } = {}): Promise<DeliveryResult> {
  const result: DeliveryResult = {
    quietHours: isQuietHours(),
    people: 0,
    alerts: 0,
    pushesSent: 0,
    devicesExpired: 0,
    pushFailures: 0,
  };
  if (result.quietHours && !force) return result;

  const db = createAdminClient();

  // If a previous run crashed mid-send, put its alerts back in the queue.
  await db
    .from("notifications")
    .update({ status: "pending" })
    .eq("status", "sending")
    .lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString());

  // Claim pending alerts in ONE statement. If two runs overlap, each row can
  // only be claimed by one of them, so nobody gets the same alert twice.
  const { data: claimedIds, error } = await db
    .from("notifications")
    .update({ status: "sending" })
    .eq("status", "pending")
    .select("id");
  if (error) throw new Error(`Claiming alerts: ${error.message}`);
  if (!claimedIds?.length) return result;

  // Then look up the set + theme details for what we claimed.
  // (sets has two links to themes, so we name which one: root_theme_id.)
  const claimed: {
    id: number;
    user_id: string;
    set_num: string;
    kind: string;
    sets: unknown;
  }[] = [];
  const ids = claimedIds.map((r) => r.id);
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error: readError } = await db
      .from("notifications")
      .select(
        "id, user_id, set_num, kind, sets(name, year, rrp_usd, root_theme_id, themes!sets_root_theme_id_fkey(display_name))",
      )
      .in("id", ids.slice(i, i + CHUNK));
    if (readError) throw new Error(`Reading claimed alerts: ${readError.message}`);
    claimed.push(...(data ?? []));
  }

  type Row = (typeof claimed)[number];
  const byUser = new Map<string, Row[]>();
  for (const row of claimed) byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);

  const thisYear = new Date().getFullYear();
  for (const [userId, rows] of byUser) {
    const items: AlertItem[] = rows.map((r) => {
      const set = r.sets as unknown as {
        name: string;
        year: number;
        rrp_usd: number | string | null; // Postgres numeric can arrive as text
        root_theme_id: number;
        themes: { display_name: string } | null;
      };
      return {
        kind: r.kind as AlertKind,
        rrpUsd: set.rrp_usd === null ? null : Number(set.rrp_usd),
        setNum: r.set_num,
        setName: set.name,
        year: set.year,
        themeId: set.root_theme_id,
        themeName: set.themes?.display_name ?? "LEGO",
      };
    });

    const { data: devices } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, failure_count")
      .eq("user_id", userId);

    let reached = 0;
    // Badge = alerts already unread + the ones we're sending now.
    const badge = (await unreadAlertCount(userId)) + rows.length;
    const message = { ...buildAlertMessage(items, thisYear), badge };
    const outcomes = await Promise.all(
      ((devices ?? []) as StoredSubscription[]).map((d) => sendPush(d, message)),
    );
    for (const o of outcomes) {
      if (o.status === "sent") reached++;
      else if (o.status === "expired") result.devicesExpired++;
      else result.pushFailures++;
    }

    // Marked sent even with zero devices: the alert still shows in the
    // in-app inbox, and we don't want it to pile up and fire weeks later.
    await db
      .from("notifications")
      .update({ status: "sent", sent_at: new Date().toISOString(), devices_reached: reached })
      .in("id", rows.map((r) => r.id));

    result.people++;
    result.alerts += rows.length;
    result.pushesSent += reached;
  }
  return result;
}
