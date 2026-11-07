import Link from "next/link";
import { AlertsCard } from "@/components/alerts-card";
import { buttonPrimary, buttonSecondary, Card } from "@/components/card";
import { DeviceStatus } from "@/components/device-status";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/auth";
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

  const { data: follows } = await createAdminClient()
    .from("theme_follows")
    .select("themes(display_name)")
    .eq("user_id", user.id);
  const followedNames = (follows ?? [])
    .map((f) => (f.themes as unknown as { display_name: string } | null)?.display_name)
    .filter(Boolean)
    .sort();

  return (
    <>
      <p className="text-lg text-white">
        Hi, <b>{user.username}</b> 👋
      </p>
      <Card title="Your themes">
        <p className="mb-3">
          {followedNames.length
            ? `Following: ${followedNames.join(", ")}`
            : "You're not following any themes yet. Pick some to get alerts about new sets."}
        </p>
        <Link href="/themes" className={`${buttonPrimary} block text-center`}>
          {followedNames.length ? "Browse themes" : "Pick themes"}
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
