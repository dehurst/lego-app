import "server-only";
import { APP_TIMEZONE } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchBricksetYears, hasBricksetKey } from "./brickset";

// Brickset limits how many set lookups we make per day, and launch dates
// are known well ahead of time, so fetching every 6 hours is plenty.
const FETCH_EVERY_HOURS = 6;
const STATE_KEY = "brickset";

type BricksetState = { lastFetchAt?: string };

/** Today's date (YYYY-MM-DD) in the app's time zone. */
export function todayLocal(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(now);
}

export type BricksetSyncResult =
  | { ran: false; reason: string }
  | { ran: true; fetched: number; calls: number; sampleFields: string[] };

/** Step A: pull fresh dates/prices from Brickset (at most every 6 hours). */
export async function syncBrickset({ force = false } = {}): Promise<BricksetSyncResult> {
  if (!hasBricksetKey()) return { ran: false, reason: "no BRICKSET_API_KEY" };
  const db = createAdminClient();

  const { data: state } = await db
    .from("app_state")
    .select("value")
    .eq("key", STATE_KEY)
    .maybeSingle<{ value: BricksetState }>();
  const last = state?.value?.lastFetchAt ? Date.parse(state.value.lastFetchAt) : 0;
  if (!force && Date.now() - last < FETCH_EVERY_HOURS * 3_600_000) {
    return { ran: false, reason: "fetched recently" };
  }

  // Same window as the Rebrickable catalog, plus next year's announcements.
  const year = new Date().getFullYear();
  const result = await fetchBricksetYears([year - 1, year, year + 1]);

  const now = new Date().toISOString();
  for (let i = 0; i < result.sets.length; i += 500) {
    const { error } = await db.from("brickset_sets").upsert(
      result.sets.slice(i, i + 500).map((s) => ({
        set_num: s.setNum,
        brickset_id: s.bricksetId,
        name: s.name,
        year: s.year,
        theme: s.theme,
        category: s.category,
        released: s.released,
        launch_date: s.launchDate,
        exit_date: s.exitDate,
        rrp_usd: s.rrpUsd,
        availability: s.availability,
        brickset_url: s.url,
        fetched_at: now,
      })),
      { onConflict: "set_num" },
    );
    if (error) throw new Error(`Saving Brickset data: ${error.message}`);
  }

  await db
    .from("app_state")
    .upsert({ key: STATE_KEY, value: { lastFetchAt: now }, updated_at: now });
  return { ran: true, fetched: result.sets.length, calls: result.calls, sampleFields: result.sampleFields };
}

/**
 * Step B (every hour, no API calls): recompute each set's availability for
 * today and return the sets that just went from "coming" to "available".
 * The rules live in the SQL function refresh_set_availability.
 */
export async function refreshAvailability(): Promise<string[]> {
  const { data, error } = await createAdminClient().rpc("refresh_set_availability", {
    today: todayLocal(),
  });
  if (error) throw new Error(`Refreshing availability: ${error.message}`);
  return ((data ?? []) as { set_num: string }[]).map((r) => r.set_num);
}
