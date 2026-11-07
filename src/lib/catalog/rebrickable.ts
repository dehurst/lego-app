import "server-only";
import { requireEnv } from "@/lib/env";
import type { CatalogSet, CatalogSource, CatalogTheme } from "./types";

// Rebrickable API v3 docs: https://rebrickable.com/api/v3/docs/
const BASE = "https://rebrickable.com/api/v3/lego";

type Page<T> = { count: number; next: string | null; results: T[] };
type RbTheme = { id: number; parent_id: number | null; name: string };
type RbSet = {
  set_num: string;
  name: string;
  year: number;
  theme_id: number;
  num_parts: number;
  set_img_url: string | null;
  set_url: string | null;
  last_modified_dt: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function rbFetch<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `key ${requireEnv("REBRICKABLE_API_KEY")}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    // 429 = "slow down". Rebrickable allows roughly 1 request per second.
    if (res.status === 429 && attempt < 3) {
      await sleep(1500 * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Rebrickable ${res.status} for ${new URL(url).pathname}`);
    }
    return (await res.json()) as T;
  }
}

/** Follows the `next` links until every page is loaded. */
async function fetchAllPages<T>(firstUrl: string): Promise<T[]> {
  const all: T[] = [];
  let url: string | null = firstUrl;
  while (url) {
    const page: Page<T> = await rbFetch<Page<T>>(url);
    all.push(...page.results);
    url = page.next;
    if (url) await sleep(1100); // stay polite: about 1 request per second
  }
  return all;
}

export const rebrickable: CatalogSource = {
  async fetchThemes(): Promise<CatalogTheme[]> {
    const themes = await fetchAllPages<RbTheme>(`${BASE}/themes/?page_size=1000`);
    return themes.map((t) => ({ id: t.id, parentId: t.parent_id, name: t.name }));
  },

  async fetchSetsSince(minYear: number): Promise<CatalogSet[]> {
    const sets = await fetchAllPages<RbSet>(
      `${BASE}/sets/?min_year=${minYear}&page_size=1000`,
    );
    return sets.map((s) => ({
      setNum: s.set_num,
      name: s.name,
      year: s.year,
      themeId: s.theme_id,
      numParts: s.num_parts,
      imageUrl: s.set_img_url,
      sourceUrl: s.set_url,
      sourceModifiedAt: s.last_modified_dt,
    }));
  },
};
