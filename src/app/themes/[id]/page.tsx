import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { RebrickableCredit } from "@/components/rebrickable-credit";
import { SET_CARD_COLUMNS, SetCard, statusOf, type SetCardData } from "@/components/set-card";
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

type Filter = "all" | "available" | "coming";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "On sale" },
  { key: "coming", label: "Coming soon" },
];

// Coming soon first, then on sale, then sets we can't classify yet.
// (Retired sets are filtered out in the database query.)
const STATUS_ORDER = { coming: 0, available: 1, other: 2 } as const;
type Group = keyof typeof STATUS_ORDER;
const GROUP_LABELS: Record<Group, string> = {
  coming: "Coming soon",
  available: "On sale",
  other: "Other sets",
};

function groupOf(s: SetCardData, thisYear: number): Group {
  const status = statusOf(s, thisYear);
  return status === "coming" || status === "available" ? status : "other";
}

/** Sort order within the page. Dates are "YYYY-MM-DD", so text order = date order. */
function compareSets(a: SetCardData, b: SetCardData, thisYear: number): number {
  const ga = groupOf(a, thisYear);
  const gb = groupOf(b, thisYear);
  if (ga !== gb) return STATUS_ORDER[ga] - STATUS_ORDER[gb];
  const da = a.launch_date ?? `${a.year}-12-31`;
  const db = b.launch_date ?? `${b.year}-12-31`;
  // Coming soon: the soonest launch first. Everything else: newest first.
  return ga === "coming" ? da.localeCompare(db) : db.localeCompare(da);
}

function groupByStatus(sets: SetCardData[], thisYear: number) {
  const groups: { group: Group; sets: SetCardData[] }[] = [];
  for (const s of sets) {
    const group = groupOf(s, thisYear);
    const last = groups.at(-1);
    if (last?.group === group) last.sets.push(s);
    else groups.push({ group, sets: [s] });
  }
  return groups;
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
      .select(SET_CARD_COLUMNS)
      .eq("root_theme_id", id)
      // Hide retired sets: you can't buy them anymore.
      .or("availability_status.is.null,availability_status.neq.retired")
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
  const all = (sets ?? []) as SetCardData[];
  const count = (key: Filter) =>
    key === "all" ? all.length : all.filter((s) => groupOf(s, thisYear) === key).length;
  const shown = (filter === "all" ? all : all.filter((s) => groupOf(s, thisYear) === filter))
    .slice()
    .sort((a, b) => compareSets(a, b, thisYear));

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-3xl font-extrabold text-brick">{theme.display_name}</h1>
      <FollowButton themeId={theme.id} following={Boolean(follow)} size="large" />
      <p className="text-sm text-zinc-400">
        Followers get an alert when a new {theme.display_name} set is announced, and again when
        it goes on sale.
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
      {groupByStatus(shown, thisYear).map(({ group, sets: groupSets }) => (
        <section key={group} className="flex flex-col gap-3">
          {filter === "all" && (
            <h2 className="mt-2 text-lg font-bold text-white">
              {GROUP_LABELS[group]} ({groupSets.length})
            </h2>
          )}
          <ul className="flex flex-col gap-3">
            {groupSets.map((s) => (
              <li key={s.set_num}>
                <SetCard set={s} thisYear={thisYear} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
