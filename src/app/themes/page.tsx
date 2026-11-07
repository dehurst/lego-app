import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { RebrickableCredit } from "@/components/rebrickable-credit";
import { RemoteImage } from "@/components/remote-image";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FollowButton } from "./follow-button";

export default function ThemesPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
      <div className="flex w-full max-w-xl items-center justify-between">
        <Link href="/" className="text-zinc-300 underline">
          ← Home
        </Link>
        <h1 className="text-2xl font-extrabold text-brick">Themes</h1>
      </div>
      <Suspense fallback={<p className="text-zinc-400">Loading themes…</p>}>
        <ThemeList />
      </Suspense>
      <RebrickableCredit />
    </main>
  );
}

type ThemeRow = {
  id: number;
  display_name: string;
  recent_set_count: number;
  cover_image_url: string | null;
};

async function ThemeList() {
  const user = await getApprovedUser();
  if (!user) return <Card title="Log in first">Themes are for approved members.</Card>;

  const db = createAdminClient();
  const [{ data: themes }, { data: follows }] = await Promise.all([
    db
      .from("themes")
      .select("id, display_name, recent_set_count, cover_image_url, root_id")
      .eq("hidden", false)
      .gt("recent_set_count", 0)
      .order("display_name"),
    db.from("theme_follows").select("theme_id").eq("user_id", user.id),
  ]);

  // Only top-level themes (a theme is top-level when it is its own root).
  const roots = (themes ?? []).filter((t) => t.id === t.root_id) as ThemeRow[];
  if (roots.length === 0) {
    return (
      <Card title="No themes yet">
        The LEGO catalog hasn&apos;t been loaded. An admin can tap{" "}
        <b>Sync catalog now</b> on the Admin page.
      </Card>
    );
  }

  const followed = new Set((follows ?? []).map((f) => f.theme_id));
  const mine = roots.filter((t) => followed.has(t.id));

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      {mine.length > 0 && <ThemeGrid title={`Following (${mine.length})`} themes={mine} followed={followed} />}
      <ThemeGrid title="All themes" themes={roots} followed={followed} />
    </div>
  );
}

function ThemeGrid({
  title,
  themes,
  followed,
}: {
  title: string;
  themes: ThemeRow[];
  followed: Set<number>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-white">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {themes.map((t) => (
          <li key={t.id}>
            <Link
              href={`/themes/${t.id}`}
              className="flex h-full flex-col overflow-hidden rounded-2xl bg-white text-zinc-900 shadow"
            >
              <RemoteImage src={t.cover_image_url} alt="" className="h-24 w-full bg-white p-2" />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <span className="font-bold leading-tight">{t.display_name}</span>
                <span className="text-xs text-zinc-500">{t.recent_set_count} recent sets</span>
                <span className="mt-auto">
                  <FollowButton themeId={t.id} following={followed.has(t.id)} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
