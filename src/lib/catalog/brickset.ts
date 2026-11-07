import "server-only";
import { optionalEnv } from "@/lib/env";

// Brickset API v3: https://brickset.com/article/52664/api-version-3-documentation
// The key goes in the URL (?apiKey=…), so never log full request URLs.
const BASE = "https://brickset.com/api/v3.asmx";
const PAGE_SIZE = 500; // Brickset's maximum
const MAX_PAGES_PER_QUERY = 8; // safety net so a bad query can't burn our daily quota

/** Just the Brickset fields we use. Everything is optional: trust nothing. */
type RawSet = {
  setID?: number;
  number?: string;
  numberVariant?: number;
  name?: string;
  year?: number;
  theme?: string;
  category?: string;
  released?: boolean;
  launchDate?: string | null;
  exitDate?: string | null;
  availability?: string;
  bricksetURL?: string;
  LEGOCom?: { US?: { retailPrice?: number; dateFirstAvailable?: string } };
};

export type BricksetSet = {
  setNum: string; // "75301-1"
  bricksetId: number | null;
  name: string | null;
  year: number | null;
  theme: string | null;
  category: string | null;
  released: boolean | null;
  launchDate: string | null; // YYYY-MM-DD
  exitDate: string | null;
  rrpUsd: number | null;
  availability: string | null;
  url: string | null;
};

export function hasBricksetKey(): boolean {
  return Boolean(optionalEnv("BRICKSET_API_KEY"));
}

const day = (value: string | null | undefined) =>
  value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

function normalize(raw: RawSet): BricksetSet | null {
  if (!raw.number) return null;
  return {
    setNum: `${raw.number}-${raw.numberVariant ?? 1}`,
    bricksetId: raw.setID ?? null,
    name: raw.name ?? null,
    year: raw.year ?? null,
    theme: raw.theme ?? null,
    category: raw.category ?? null,
    released: typeof raw.released === "boolean" ? raw.released : null,
    // Official launch date; fall back to the first day LEGO.com sold it.
    launchDate: day(raw.launchDate) ?? day(raw.LEGOCom?.US?.dateFirstAvailable),
    // Only the official exit date. (LEGO.com's "last available" date can
    // just mean "last time Brickset checked", which would wrongly look retired.)
    exitDate: day(raw.exitDate),
    rrpUsd: typeof raw.LEGOCom?.US?.retailPrice === "number" ? raw.LEGOCom.US.retailPrice : null,
    availability: raw.availability ?? null,
    url: raw.bricksetURL ?? null,
  };
}

export type BricksetFetch = {
  sets: BricksetSet[];
  calls: number;
  /** Field names of the first raw set, so an admin can spot API changes. */
  sampleFields: string[];
};

async function getSetsPage(params: Record<string, unknown>): Promise<RawSet[]> {
  const url =
    `${BASE}/getSets?apiKey=${encodeURIComponent(optionalEnv("BRICKSET_API_KEY") ?? "")}` +
    `&userHash=&params=${encodeURIComponent(JSON.stringify(params))}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Brickset HTTP ${res.status}`);
  const body = (await res.json()) as { status?: string; message?: string; sets?: RawSet[] };
  // Brickset reports errors inside a normal 200 response.
  if (body.status !== "success") throw new Error(`Brickset: ${body.message ?? "unknown error"}`);
  return body.sets ?? [];
}

/** All sets for the given years (one query per year, paged). */
export async function fetchBricksetYears(years: number[]): Promise<BricksetFetch> {
  const out: BricksetFetch = { sets: [], calls: 0, sampleFields: [] };
  for (const year of years) {
    for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
      const raw = await getSetsPage({ year: String(year), pageSize: PAGE_SIZE, pageNumber: page });
      out.calls++;
      if (!out.sampleFields.length && raw[0]) {
        out.sampleFields = [
          ...Object.keys(raw[0]),
          ...Object.keys(raw[0].LEGOCom?.US ?? {}).map((k) => `LEGOCom.US.${k}`),
        ];
      }
      for (const r of raw) {
        const set = normalize(r);
        if (set) out.sets.push(set);
      }
      if (raw.length < PAGE_SIZE) break;
    }
  }
  return out;
}
