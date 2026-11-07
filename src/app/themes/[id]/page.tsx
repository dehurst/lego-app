import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/card";
import { RebrickableCredit } from "@/components/rebrickable-credit";
import { RemoteImage } from "@/components/remote-image";
import { getApprovedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FollowButton } from "../follow-button";

export default function ThemePage({ params }: PageProps<"/themes/[id]">) {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-xl">
        <Link href="/themes" className="text-zinc-300 underline">
          ← All themes
        </Link>
      </div>
      {/* The theme id comes from the URL, which is only known per request. */}
      <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
        <ThemeDetail params={params} />
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
};

async function ThemeDetail({ params }: { params: PageProps<"/themes/[id]">["params"] }) {
  const user = await getApprovedUser();
  if (!user) return <Card title="Log in first">Themes are for approved members.</Card>;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return <Card title="Not found">That theme doesn&apos;t exist.</Card>;

  const db = createAdminClient();
  const [{ data: theme }, { data: sets }, { data: follow }] = await Promise.all([
    db
      .from("themes")
      .select("id, display_name, recent_set_count")
      .eq("id", id)
      .eq("hidden", false)
      .maybeSingle(),
    db
      .from("sets")
      .select("set_num, name, year, num_parts, image_url, source_url")
      .eq("root_theme_id", id)
      .order("year", { ascending: false })
      .order("first_seen_at", { ascending: false })
      .limit(100),
    db
      .from("theme_follows")
      .select("theme_id")
      .eq("user_id", user.id)
      .eq("theme_id", id)
      .maybeSingle(),
  ]);

  if (!theme) return <Card title="Not found">That theme doesn&apos;t exist.</Card>;
  const thisYear = new Date().getFullYear();

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <h1 className="text-3xl font-extrabold text-brick">{theme.display_name}</h1>
      <FollowButton themeId={theme.id} following={Boolean(follow)} size="large" />
      <p className="text-sm text-zinc-400">
        Follow to get an alert when a new {theme.display_name} set is announced.
      </p>
      <ul className="flex flex-col gap-3">
        {(sets as SetRow[] | null)?.map((s) => (
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
                {s.year > thisYear && (
                  <span className="mt-1 w-fit rounded bg-brick px-1.5 py-0.5 text-xs font-bold text-navy">
                    Coming {s.year}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
