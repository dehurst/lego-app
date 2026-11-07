import "server-only";
import { syncCatalog, type SyncResult } from "@/lib/catalog/sync";
import { deliverPendingAlerts, queueNewSetAlerts, type DeliveryResult } from "./queue";

export type HourlyResult = {
  sync: Omit<SyncResult, "newSetNums"> & { newSets: number };
  queued: number;
  delivery: DeliveryResult;
};

/** The whole hourly job: sync → queue alerts → deliver (unless quiet hours). */
export async function runHourlyCheck({ force = false } = {}): Promise<HourlyResult> {
  const sync = await syncCatalog();
  // The very first sync loads the whole catalog: everything looks "new",
  // so we alert nobody.
  const queued = sync.firstSync ? 0 : await queueNewSetAlerts(sync.newSetNums);
  const delivery = await deliverPendingAlerts({ force });
  const { newSetNums, ...rest } = sync;
  return { sync: { ...rest, newSets: newSetNums.length }, queued, delivery };
}
