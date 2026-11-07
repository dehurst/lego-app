import "server-only";
import {
  refreshAvailability,
  syncBrickset,
  type BricksetSyncResult,
} from "@/lib/catalog/availability";
import { syncCatalog, type SyncResult } from "@/lib/catalog/sync";
import { deliverPendingAlerts, queueAlerts, type DeliveryResult } from "./queue";

export type HourlyResult = {
  sync: Omit<SyncResult, "newSetNums"> & { newSets: number };
  brickset: BricksetSyncResult;
  nowAvailable: number;
  queued: number;
  delivery: DeliveryResult;
};

/**
 * The whole hourly job:
 * 1. Rebrickable sync → "new set" alerts
 * 2. Brickset dates (every 6h) + availability check → "now in stores" alerts
 * 3. Deliver (unless quiet hours)
 */
export async function runHourlyCheck({
  force = false,
  forceBrickset = false,
} = {}): Promise<HourlyResult> {
  const sync = await syncCatalog();
  // The very first sync loads the whole catalog: everything looks "new",
  // so we alert nobody.
  let queued = sync.firstSync ? 0 : await queueAlerts(sync.newSetNums, "new_set");

  // A Brickset problem must never block new-set alerts, so it's contained.
  let brickset: BricksetSyncResult;
  let nowAvailable = 0;
  try {
    brickset = await syncBrickset({ force: forceBrickset });
    const justAvailable = await refreshAvailability();
    nowAvailable = justAvailable.length;
    queued += await queueAlerts(justAvailable, "now_available");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("Brickset step failed", reason);
    brickset = { ran: false, reason: `error: ${reason}` };
  }

  const delivery = await deliverPendingAlerts({ force });
  const { newSetNums, ...rest } = sync;
  return { sync: { ...rest, newSets: newSetNums.length }, brickset, nowAvailable, queued, delivery };
}
