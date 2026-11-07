import Link from "next/link";
import { AlertsCard } from "@/components/alerts-card";
import { buttonPrimary, buttonSecondary, Card } from "@/components/card";
import { DeviceStatus } from "@/components/device-status";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/auth";
import { AlertsOffBanner } from "@/components/alerts-off-banner";
import { unreadAlertCount } from "@/lib/alerts/inbox";
import { createAdminClient } from "@/lib/supabase/admin";

// The part of the home screen that depends on who's logged in. It reads the
// session cookie, so it renders per request inside a <Suspense> boundary.
export async function Account() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Card>
        <div className="flex flex-col gap-3">
          <Link href="/login" className={`${buttonPrimary} text-center`}>
            Log in
          </Link>
          <Link href="/signup" className={`${buttonSecondary} text-center`}>
            I have an invite code
          </Link>
        </div>
      </Card>
    );
  }

  if (user.status === "pending") {
    return (
      <>
        <Card title={`Almost there, ${user.username}!`}>
          <p>
            Your account is waiting for an admin to approve it. Check back
            soon. You&apos;ll be able to turn on alerts once you&apos;re in.
          </p>
        </Card>
        <SignOutButton />
      </>
    );
  }

  const [{ data: follows }, unread] = await Promise.all([
    createAdminClient()
      .from("theme_follows")
      .select("theme_id, themes(display_name)")
      .eq("user_id", user.id),
    unreadAlertCount(user.id),
  ]);
  const followed = (follows ?? [])
    .map((f) => ({
      id: f.theme_id as number,
      name: (f.themes as unknown as { display_name: string } | null)?.display_name ?? "",
    }))
    .filter((t) => t.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <AlertsOffBanner />
      <p className="text-lg text-white">
        Hi, <b>{user.username}</b> 👋
      </p>

      <Link
        href="/alerts"
        className="flex w-full max-w-sm items-center justify-between rounded-2xl bg-white px-5 py-4 text-left font-bold text-zinc-900 shadow-lg"
      >
        <span>🔔 Alerts</span>
        {unread > 0 ? (
          <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-sm text-white">
            {unread} new
          </span>
        ) : (
          <span className="text-sm font-normal text-zinc-400">All caught up →</span>
        )}
      </Link>

      <Card title="Your themes">
        {followed.length ? (
          <ul className="mb-3 flex flex-wrap gap-2">
            {followed.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/themes/${t.id}`}
                  className="block rounded-full bg-navy px-3 py-1 text-sm font-semibold text-white"
                >
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3">
            You&apos;re not following any themes yet. Pick some to get alerts about new sets.
          </p>
        )}
        <Link href="/themes" className={`${buttonPrimary} block text-center`}>
          {followed.length ? "Browse all themes" : "Pick themes"}
        </Link>
      </Card>
      <AlertsCard />
      {user.role === "admin" && (
        <Link href="/admin" className="font-semibold text-brick underline">
          Admin: people &amp; invites →
        </Link>
      )}
      <DeviceStatus />
      <SignOutButton />
    </>
  );
}
