import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { RebrickableCredit } from "@/components/rebrickable-credit";
import { RemoteImage } from "@/components/remote-image";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FollowButton } from "../follow-button";

type Props = PageProps<"/themes/[id]">;

export default function ThemePage({ params, searchParams }: Props) {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-xl">
        <Link href="/themes" className="text-zinc-300 underline">
          ← All themes
        </Link>
      </div>
      {/* The theme id and filter come from the URL, known only per request. */}
      <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
        <ThemeDetail params={params} searchParams={searchParams} />
      </Suspense>
      <RebrickableCredit />
    </main>
  );
}

type SetRow = {
  set_num: string;
  name: string;
  year: number;
  num_parts: number;
  image_url: string | null;
  source_url: string | null;
  availability_status: "coming" | "available" | "retired" | null;
  launch_date: string | null;
  rrp_usd: number | string | null;
};

type Filter = "all" | "available" | "coming" | "retired";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "On sale" },
  { key: "coming", label: "Coming soon" },
  { key: "retired", label: "Retired" },
];

/**
 * Where a set stands. Brickset's dates win when we have them; otherwise
 * fall back to the release year (a future year means "coming").
 */
function statusOf(s: SetRow, thisYear: number): Exclude<Filter, "all"> | null {
  if (s.availability_status) return s.availability_status;
  return s.year > thisYear ? "coming" : null;
}

function formatLaunch(date: string): string {
  // Dates are plain days ("2027-03-01"); format at noon UTC so no time zone
  // can push them onto the day before.
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ s, thisYear }: { s: SetRow; thisYear: number }) {
  const status = statusOf(s, thisYear);
  const price = s.rrp_usd ? ` · $${Number(s.rrp_usd).toFixed(2)}` : "";
  if (status === "available") {
    return <Badge className="bg-green-600 text-white">On sale{price}</Badge>;
  }
  if (status === "coming") {
    return (
      <Badge className="bg-brick text-navy">
        Coming {s.launch_date ? formatLaunch(s.launch_date) : s.year}
        {price}
      </Badge>
    );
  }
  if (status === "retired") return <Badge className="bg-zinc-300 text-zinc-700">Retired</Badge>;
  return null;
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`mt-1 w-fit rounded px-1.5 py-0.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

async function ThemeDetail({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const user = await getApprovedUser();
  if (!user) return <Card title="Log in first">Themes are for approved members.</Card>;

  const id = Number((await params).id);
  const show = (await searchParams).show;
  const filter: Filter = FILTERS.some((f) => f.key === show) ? (show as Filter) : "all";
  if (!Number.isInteger(id)) return <Card title="Not found">That theme doesn&apos;t exist.</Card>;

  const db = createAdminClient();
  const [{ data: theme }, { data: sets }, { data: follow }] = await Promise.all([
    db.from("themes").select("id, display_name").eq("id", id).eq("hidden", false).maybeSingle(),
    db
      .from("sets")
      .select(
        "set_num, name, year, num_parts, image_url, source_url, availability_status, launch_date, rrp_usd",
      )
      .eq("root_theme_id", id)
      .order("year", { ascending: false })
      .order("first_seen_at", { ascending: false })
      .limit(1000),
    db
      .from("theme_follows")
      .select("theme_id")
      .eq("user_id", user.id)
      .eq("theme_id", id)
      .maybeSingle(),
  ]);

  if (!theme) return <Card title="Not found">That theme doesn&apos;t exist.</Card>;
  const thisYear = new Date().getFullYear();
  const all = (sets ?? []) as SetRow[];
  const count = (key: Filter) =>
    key === "all" ? all.length : all.filter((s) => statusOf(s, thisYear) === key).length;
  const shown = (filter === "all" ? all : all.filter((s) => statusOf(s, thisYear) === filter))
    .slice()
    .sort((a, b) => compareSets(a, b, thisYear));
  // In the "All" view, show a heading wherever the status changes.
  const groups = groupByStatus(shown, thisYear);

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-3xl font-extrabold text-brick">{theme.display_name}</h1>
      <FollowButton themeId={theme.id} following={Boolean(follow)} size="large" />
      <p className="text-sm text-zinc-400">
        Followers get an alert when a new {theme.display_name} set is announced, and again when it
        goes on sale.
      </p>

      <nav className="flex flex-wrap gap-2" aria-label="Filter sets">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? `/themes/${id}` : `/themes/${id}?show=${f.key}`}
            replace
            className={`rounded-full px-3 py-1 text-sm font-bold ${
              filter === f.key ? "bg-brick text-navy" : "bg-white/10 text-zinc-200"
            }`}
          >
            {f.label} ({count(f.key)})
          </Link>
        ))}
      </nav>

      {shown.length === 0 && <p className="text-zinc-400">No sets here right now.</p>}
      {groups.map((group) => (
        <section key={group.status ?? "other"} className="flex flex-col gap-3">
          {filter === "all" && (
            <h2 className="mt-2 text-lg font-bold text-white">
              {GROUP_LABELS[group.status ?? "other"]} ({group.sets.length})
            </h2>
          )}
          <SetList sets={group.sets} thisYear={thisYear} />
        </section>
      ))}
    </div>
  );
}

// Coming soon first, then on sale, then sets we can't classify, retired last.
const STATUS_ORDER = { coming: 0, available: 1, other: 2, retired: 3 } as const;
const GROUP_LABELS = {
  coming: "Coming soon",
  available: "On sale",
  other: "Other sets",
  retired: "Retired",
} as const;

const statusKey = (s: SetRow, thisYear: number) => statusOf(s, thisYear) ?? "other";

/** Sort order within the page. Dates are "YYYY-MM-DD", so text order = date order. */
function compareSets(a: SetRow, b: SetRow, thisYear: number): number {
  const sa = statusKey(a, thisYear);
  const sb = statusKey(b, thisYear);
  if (sa !== sb) return STATUS_ORDER[sa] - STATUS_ORDER[sb];
  const da = a.launch_date ?? `${a.year}-12-31`;
  const db = b.launch_date ?? `${b.year}-12-31`;
  // Coming soon: the soonest launch first. Everything else: newest first.
  return sa === "coming" ? da.localeCompare(db) : db.localeCompare(da);
}

function groupByStatus(sets: SetRow[], thisYear: number) {
  const groups: { status: keyof typeof STATUS_ORDER; sets: SetRow[] }[] = [];
  for (const s of sets) {
    const status = statusKey(s, thisYear);
    const last = groups.at(-1);
    if (last?.status === status) last.sets.push(s);
    else groups.push({ status, sets: [s] });
  }
  return groups;
}

function SetList({ sets, thisYear }: { sets: SetRow[]; thisYear: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {sets.map((s) => (
        <li key={s.set_num}>
          <a
            href={s.source_url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 rounded-2xl bg-white p-3 text-zinc-900 shadow"
          >
            <RemoteImage src={s.image_url} alt={s.name} className="h-20 w-24 shrink-0 rounded-lg" />
            <span className="flex flex-col justify-center">
              <span className="font-bold leading-tight">{s.name}</span>
              <span className="text-sm text-zinc-500">
                #{s.set_num.replace(/-1$/, "")} · {s.year} ·{" "}
                {s.num_parts > 0 ? `${s.num_parts.toLocaleString()} pieces` : "pieces TBA"}
              </span>
              <StatusBadge s={s} thisYear={thisYear} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
