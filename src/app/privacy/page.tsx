import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { getCurrentUser } from "@/lib/auth";
import { DeleteAccountButton } from "./delete-account";

export const metadata = { title: "Privacy · Brick Drop" };

// Written for parents first: short, plain, and specific. Update the date
// whenever what we store changes.
const LAST_UPDATED = "November 2026";

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
      <div className="flex w-full max-w-xl items-center justify-between">
        <Link href="/" className="text-zinc-300 underline">
          ← Home
        </Link>
        <h1 className="text-2xl font-extrabold text-brick">Privacy</h1>
      </div>

      <div className="flex w-full max-w-xl flex-col gap-4">
        <Card title="The short version">
          <p>
            Brick Drop is a small private app a parent built with their kid, for them and a few
            friends. It&apos;s not a business: no ads, no tracking, nothing sold. It stores as
            little as possible: <b>a username, not a name or email</b>.
          </p>
        </Card>

        <Card title="What we store">
          <ul className="list-disc space-y-1 pl-5">
            <li>The username you pick (please don&apos;t use your real name).</li>
            <li>
              Your password, stored scrambled by our login provider. Nobody, including the admin,
              can read it.
            </li>
            <li>The LEGO themes you follow and the sets on your watchlist.</li>
            <li>A list of the alerts we&apos;ve sent you.</li>
            <li>
              For each device with alerts on: a delivery address from Apple or Google so
              notifications can reach it, plus the device type (like &quot;iPhone&quot;).
            </li>
            <li>When your account was created and approved.</li>
          </ul>
        </Card>

        <Card title="What we don't collect">
          <p>
            No real names, emails, phone numbers, birthdays, location, contacts or photos. No
            analytics or advertising trackers.
          </p>
        </Card>

        <Card title="Who can see it">
          <ul className="list-disc space-y-1 pl-5">
            <li>You can see your own themes, watchlist and alerts.</li>
            <li>
              The admin (the parent who runs the app) can see usernames, whether an account is
              approved, and how many devices have alerts on. Not passwords.
            </li>
            <li>Other members can&apos;t see anything about you.</li>
          </ul>
        </Card>

        <Card title="Services we use">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Supabase</b> stores the data above and handles logins. <b>Vercel</b> runs the
              app.
            </li>
            <li>
              <b>Apple</b> (or Google) delivers notifications to your device.
            </li>
            <li>
              LEGO set info comes from <b>Rebrickable</b> and <b>Brickset</b>. We never send
              them anything about you.
            </li>
            <li>
              &quot;Buy on LEGO.com&quot; buttons open LEGO&apos;s own website, which has its own
              privacy policy.
            </li>
          </ul>
        </Card>

        <Card title="Deleting your account">
          <p className="mb-3">
            You can delete your account anytime. It erases everything above right away. You can
            also ask the admin to do it for you.
          </p>
          <Suspense fallback={null}>
            <DeleteSection />
          </Suspense>
        </Card>

        <Card title="Questions?">
          <p>Parents: ask the person who invited your kid. They run the app and can help.</p>
        </Card>

        <p className="text-center text-xs text-zinc-500">Last updated {LAST_UPDATED}.</p>
      </div>
    </main>
  );
}

/** Only shown when someone is logged in. Reads the session, so it streams in. */
async function DeleteSection() {
  const user = await getCurrentUser();
  if (!user) return <p className="text-sm text-zinc-500">Log in to see this option.</p>;
  return <DeleteAccountButton />;
}
