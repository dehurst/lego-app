import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { rebrickable } from "./rebrickable";
import { displayThemeName, isHiddenRootTheme } from "./themes";
import type { CatalogSet, CatalogSource } from "./types";

export type SyncResult = {
  themes: number;
  sets: number; // building sets kept (merchandise etc. skipped)
  skipped: number;
  newSetNums: string[]; // sets we'd never seen before this run
  firstSync: boolean; // true on the very first run: seed quietly, alert nobody
  seconds: number;
};

const CHUNK = 500;
function chunks<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Pulls themes + recent sets from the catalog source into our database and
 * reports which sets are brand new. M5's hourly job calls this, then sends
 * alerts for `newSetNums` (unless it's the first sync).
 */
export async function syncCatalog(source: CatalogSource = rebrickable): Promise<SyncResult> {
  const started = Date.now();
  const db = createAdminClient();
  const { data: run } = await db.from("sync_runs").insert({}).select("id").single();

  try {
    // Last year onward: covers what's in stores now plus announced sets.
    const minYear = new Date().getFullYear() - 1;
    const themes = await source.fetchThemes();
    const allSets = await source.fetchSetsSince(minYear);

    // Work out each theme's top-level (root) theme.
    const byId = new Map(themes.map((t) => [t.id, t]));
    const rootOf = (id: number): number => {
      let current = byId.get(id);
      for (let guard = 0; current?.parentId && guard < 10; guard++) {
        current = byId.get(current.parentId);
      }
      return current?.id ?? id;
    };
    const hiddenRoots = new Set(
      themes.filter((t) => !t.parentId && isHiddenRootTheme(t.name)).map((t) => t.id),
    );

    const sets = allSets.filter(
      (s) => byId.has(s.themeId) && !hiddenRoots.has(rootOf(s.themeId)),
    );

    // Per root theme: how many recent sets, and a picture for its tile
    // (newest set that has an image).
    const stats = new Map<number, { count: number; cover: CatalogSet | null }>();
    for (const s of sets) {
      const root = rootOf(s.themeId);
      const entry = stats.get(root) ?? { count: 0, cover: null };
      entry.count++;
      if (s.imageUrl && (!entry.cover || s.year > entry.cover.year)) entry.cover = s;
      stats.set(root, entry);
    }

    const now = new Date().toISOString();
    for (const batch of chunks(themes)) {
      const { error } = await db.from("themes").upsert(
        batch.map((t) => ({
          id: t.id,
          parent_id: t.parentId,
          root_id: rootOf(t.id),
          name: t.name,
          display_name: displayThemeName(t.name),
          hidden: hiddenRoots.has(rootOf(t.id)),
          recent_set_count: stats.get(t.id)?.count ?? 0,
          cover_image_url: stats.get(t.id)?.cover?.imageUrl ?? null,
          synced_at: now,
        })),
      );
      if (error) throw new Error(`Saving themes: ${error.message}`);
    }

    // Which of these sets have we seen before?
    const { count: existingCount } = await db
      .from("sets")
      .select("set_num", { count: "exact", head: true });
    const firstSync = (existingCount ?? 0) === 0;

    const known = new Set<string>();
    for (const batch of chunks(sets.map((s) => s.setNum), 300)) {
      const { data, error } = await db.from("sets").select("set_num").in("set_num", batch);
      if (error) throw new Error(`Reading sets: ${error.message}`);
      for (const row of data ?? []) known.add(row.set_num);
    }
    const newSetNums = sets.filter((s) => !known.has(s.setNum)).map((s) => s.setNum);

    // Save. We never send first_seen_at, so the database keeps the original
    // value for existing sets and fills in "now" for new ones.
    for (const batch of chunks(sets)) {
      const { error } = await db.from("sets").upsert(
        batch.map((s) => ({
          set_num: s.setNum,
          name: s.name,
          year: s.year,
          theme_id: s.themeId,
          root_theme_id: rootOf(s.themeId),
          num_parts: s.numParts,
          image_url: s.imageUrl,
          source_url: s.sourceUrl,
          source_modified_at: s.sourceModifiedAt,
          last_synced_at: now,
        })),
        { onConflict: "set_num" },
      );
      if (error) throw new Error(`Saving sets: ${error.message}`);
    }

    const result: SyncResult = {
      themes: themes.length,
      sets: sets.length,
      skipped: allSets.length - sets.length,
      newSetNums,
      firstSync,
      seconds: Math.round((Date.now() - started) / 100) / 10,
    };
    if (run) {
      await db
        .from("sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: true,
          stats: { ...result, newSetNums: newSetNums.slice(0, 200) },
        })
        .eq("id", run.id);
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (run) {
      await db
        .from("sync_runs")
        .update({ finished_at: new Date().toISOString(), ok: false, error: message })
        .eq("id", run.id);
    }
    throw err;
  }
}
