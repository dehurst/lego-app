import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { RebrickableCredit } from "@/components/rebrickable-credit";
import { SET_CARD_COLUMNS, SetCard, type SetCardData } from "@/components/set-card";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarkSeen } from "./mark-seen";

export default function AlertsPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
      <div className="flex w-full max-w-xl items-center justify-between">
        <Link href="/" className="text-zinc-300 underline">
          ← Home
        </Link>
        <h1 className="text-2xl font-extrabold text-brick">Alerts</h1>
      </div>
      <Suspense fallback={<p className="text-zinc-400">Loading alerts…</p>}>
        <AlertList />
      </Suspense>
      <RebrickableCredit />
    </main>
  );
}

const KIND_LABELS: Record<string, string> = {
  new_set: "🧱 New set announced",
  now_available: "🛒 Now in stores",
  back_in_stock: "🔁 Back in stock",
};

type AlertRow = {
  id: number;
  kind: string;
  status: string;
  created_at: string;
  sent_at: string | null;
  sets: (SetCardData & { themes: { display_name: string } | null }) | null;
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function AlertList() {
  const user = await getApprovedUser();
  if (!user) return <Card title="Log in first">Alerts are for approved members.</Card>;

  const { data } = await createAdminClient()
    .from("notifications")
    .select(
      `id, kind, status, created_at, sent_at,
       sets(${SET_CARD_COLUMNS}, themes!sets_root_theme_id_fkey(display_name))`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const alerts = ((data ?? []) as unknown as AlertRow[]).filter((a) => a.sets);
  const thisYear = new Date().getFullYear();

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <MarkSeen />
      {alerts.length === 0 && (
        <Card title="No alerts yet">
          When a new set is announced in a theme you follow, or a set goes on sale, it shows up
          here, even if you missed the notification.{" "}
          <Link href="/themes" className="font-semibold text-navy underline">
            Pick themes to follow
          </Link>
          .
        </Card>
      )}
      <ul className="flex flex-col gap-3">
        {alerts.map((a) => (
          <li key={a.id}>
            <SetCard
              set={a.sets!}
              thisYear={thisYear}
              header={
                <>
                  {KIND_LABELS[a.kind] ?? a.kind}
                  {a.sets?.themes ? ` · ${a.sets.themes.display_name}` : ""} ·{" "}
                  {a.status === "sent" && a.sent_at
                    ? when(a.sent_at)
                    : "⏳ arrives after 7am (quiet hours)"}
                </>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
