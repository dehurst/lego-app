import Link from "next/link";
import { Suspense } from "react";
import { buttonPrimary, Card } from "@/components/card";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveUser, createInvite, deleteInvite, removeUser } from "./actions";
import {
  ConfirmButton,
  ResetPasswordButton,
  ShareInviteButton,
  FetchBricksetButton,
  RunCheckButton,
  SimulateNewSetForm,
} from "./admin-buttons";

export default function AdminPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full max-w-sm items-center justify-between">
        <Link href="/" className="text-zinc-300 underline">
          ← Home
        </Link>
        <h1 className="text-2xl font-extrabold text-brick">Admin</h1>
      </div>
      <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

type Profile = {
  id: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
};
type Invite = { id: string; code: string; expires_at: string };

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

async function AdminContent() {
  const admin = await getAdminUser();
  if (!admin) {
    return <Card title="Admins only">You don&apos;t have access to this page.</Card>;
  }

  const db = createAdminClient();
  const [
    { data: profiles },
    { data: invites },
    { data: devices },
    { data: lastSync },
    { data: followed },
    { data: bricksetState },
    { count: setsWithStatus },
  ] = await Promise.all([
    db.from("profiles").select("id, username, role, status, created_at").order("created_at"),
    db
      .from("invite_codes")
      .select("id, code, expires_at")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    db.from("push_subscriptions").select("user_id"),
    db
      .from("sync_runs")
      .select("started_at, ok, stats, error")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("theme_follows").select("theme_id, themes(display_name)"),
    db.from("app_state").select("value").eq("key", "brickset").maybeSingle(),
    db
      .from("sets")
      .select("set_num", { count: "exact", head: true })
      .not("availability_status", "is", null),
  ]);
  const lastBrickset = (bricksetState?.value as { lastFetchAt?: string } | null)?.lastFetchAt;

  // Themes at least one person follows, for the "simulate" test.
  const followedThemes = [
    ...new Map(
      (followed ?? []).map((f) => [
        f.theme_id,
        (f.themes as unknown as { display_name: string } | null)?.display_name ?? `#${f.theme_id}`,
      ]),
    ),
  ]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const deviceCount = new Map<string, number>();
  for (const d of devices ?? []) {
    if (d.user_id) deviceCount.set(d.user_id, (deviceCount.get(d.user_id) ?? 0) + 1);
  }
  const pending = (profiles ?? []).filter((p: Profile) => p.status === "pending");
  const members = (profiles ?? []).filter((p: Profile) => p.status === "approved");

  return (
    <>
      <Card title={`Waiting for approval (${pending.length})`}>
        {pending.length === 0 && <p className="text-zinc-500">Nobody right now.</p>}
        <ul className="divide-y divide-zinc-100">
          {pending.map((p: Profile) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <b>{p.username}</b>
                <span className="block text-xs text-zinc-400">signed up {shortDate(p.created_at)}</span>
              </span>
              <span className="flex gap-2">
                <form action={approveUser}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded-lg bg-green-600 px-3 py-1 font-semibold text-white">
                    Approve
                  </button>
                </form>
                <form action={removeUser}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton
                    message={`Deny ${p.username}? Their account will be deleted.`}
                    className="rounded-lg bg-zinc-200 px-3 py-1 font-semibold"
                  >
                    Deny
                  </ConfirmButton>
                </form>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Invite codes">
        <p className="mb-3 text-sm text-zinc-500">
          Each code works once and expires after 14 days.
        </p>
        <ul className="mb-3 divide-y divide-zinc-100">
          {(invites ?? []).map((inv: Invite) => (
            <li key={inv.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <code className="font-mono font-bold select-all">{inv.code}</code>
                <span className="block text-xs text-zinc-400">expires {shortDate(inv.expires_at)}</span>
              </span>
              <span className="flex items-center gap-3">
                <ShareInviteButton code={inv.code} />
                <form action={deleteInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button className="text-sm text-zinc-400 underline">Delete</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
        <form action={createInvite}>
          <button className={buttonPrimary}>+ New invite code</button>
        </form>
      </Card>

      <Card title="LEGO catalog">
        <p className="mb-3 text-sm text-zinc-500">
          {lastSync
            ? `Last sync ${new Date(lastSync.started_at).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "medium",
                timeStyle: "short",
              })}: ${
                lastSync.ok
                  ? `${(lastSync.stats as { sets?: number } | null)?.sets ?? "?"} sets`
                  : lastSync.ok === false
                    ? `failed (${lastSync.error})`
                    : "still running or interrupted"
              }`
            : "Never synced. Tap below to load themes and sets."}
        </p>
        <RunCheckButton />
        <p className="mt-2 text-xs text-zinc-400">
          Runs automatically every hour. Running it here also sends during quiet hours.
        </p>
      </Card>

      <Card title="Brickset (availability)">
        <p className="mb-3 text-sm text-zinc-500">
          {lastBrickset
            ? `Last fetched ${new Date(lastBrickset).toLocaleString("en-US", {
                timeZone: "America/New_York",
                dateStyle: "medium",
                timeStyle: "short",
              })}. ${setsWithStatus ?? 0} sets have availability info.`
            : "Never fetched yet."}{" "}
          Fetched automatically every 6 hours.
        </p>
        <FetchBricksetButton />
      </Card>

      <Card title="Test an alert">
        <p className="mb-3 text-sm text-zinc-500">
          Makes the newest set in a theme look brand new, then runs the check, so
          everyone following that theme gets a real alert. (If anyone had that set on their
          watchlist, it&apos;s removed from it.)
        </p>
        <SimulateNewSetForm themes={followedThemes} />
      </Card>

      <Card title={`People (${members.length})`}>
        <ul className="divide-y divide-zinc-100">
          {members.map((p: Profile) => {
            const count = deviceCount.get(p.id) ?? 0;
            return (
              <li key={p.id} className="py-2">
                <div className="flex items-center justify-between">
                  <b>
                    {p.username}
                    {p.role === "admin" && (
                      <span className="ml-2 rounded bg-navy px-1.5 py-0.5 text-xs text-white">admin</span>
                    )}
                  </b>
                  {/* Zero devices = they won't get alerts. Worth a nudge. */}
                  <span className={count ? "text-sm text-zinc-500" : "text-sm font-semibold text-red-600"}>
                    {count ? `${count} device${count > 1 ? "s" : ""}` : "alerts off"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-4">
                  <ResetPasswordButton id={p.id} username={p.username} />
                  {p.id !== admin.id && (
                    <form action={removeUser} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton
                        message={`Remove ${p.username}? This deletes their account and devices.`}
                        className="text-sm text-red-600 underline"
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
