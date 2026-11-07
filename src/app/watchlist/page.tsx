import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { RebrickableCredit } from "@/components/rebrickable-credit";
import {
  SET_CARD_COLUMNS,
  SetCard,
  statusOf,
  type SetCardData,
  type SetStatus,
} from "@/components/set-card";
import { WatchButton } from "@/components/watch-button";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default function WatchlistPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
      <div className="flex w-full max-w-xl items-center justify-between">
        <Link href="/" className="text-zinc-300 underline">
          ← Home
        </Link>
        <h1 className="text-2xl font-extrabold text-brick">Watchlist</h1>
      </div>
      <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
        <Watchlist />
      </Suspense>
      <RebrickableCredit />
    </main>
  );
}

// Coming soon first (that's what you're waiting on), then on sale, then the
// rest. Retired sets stay visible here so you find out a watched set retired.
const ORDER: Record<SetStatus | "other", number> = { coming: 0, available: 1, other: 2, retired: 3 };

async function Watchlist() {
  const user = await getApprovedUser();
  if (!user) return <Card title="Log in first">The watchlist is for approved members.</Card>;

  const { data } = await createAdminClient()
    .from("watchlist_items")
    .select(`created_at, sets(${SET_CARD_COLUMNS})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const thisYear = new Date().getFullYear();
  const sets = ((data ?? []) as unknown as { sets: SetCardData | null }[])
    .map((r) => r.sets)
    .filter((s): s is SetCardData => Boolean(s))
    .sort((a, b) => ORDER[statusOf(a, thisYear) ?? "other"] - ORDER[statusOf(b, thisYear) ?? "other"]);

  if (sets.length === 0) {
    return (
      <Card title="Nothing watched yet">
        Tap <b>☆ Watch</b> on any set to keep it here. You&apos;ll get an alert the day it goes on
        sale, even if you don&apos;t follow its whole theme.{" "}
        <Link href="/themes" className="font-semibold text-navy underline">
          Browse themes
        </Link>
      </Card>
    );
  }

  return (
    <ul className="flex w-full max-w-xl flex-col gap-3">
      {sets.map((s) => (
        <li key={s.set_num}>
          <SetCard
            set={s}
            thisYear={thisYear}
            action={<WatchButton setNum={s.set_num} watching />}
          />
        </li>
      ))}
    </ul>
  );
}
