import type { ReactNode } from "react";
import { RemoteImage } from "@/components/remote-image";

// One LEGO set as shown everywhere in the app: theme pages, the alerts
// inbox and the watchlist.

/** The columns every set card needs. Select exactly these from `sets`. */
export const SET_CARD_COLUMNS =
  "set_num, name, year, num_parts, image_url, source_url, availability_status, launch_date, rrp_usd";

export type SetCardData = {
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

export type SetStatus = "coming" | "available" | "retired";

/**
 * Where a set stands. Brickset's dates win when we have them; otherwise
 * fall back to the release year (a future year means "coming").
 */
export function statusOf(s: SetCardData, thisYear: number): SetStatus | null {
  if (s.availability_status) return s.availability_status;
  return s.year > thisYear ? "coming" : null;
}

/**
 * LEGO.com product URLs include a name slug we can't predict, but its search
 * reliably finds a set by number ("75192-1" → "75192"). Just a link, not
 * scraping, so no terms-of-service concerns.
 */
export function legoComUrl(setNum: string): string {
  return `https://www.lego.com/en-us/search?q=${encodeURIComponent(setNum.replace(/-\d+$/, ""))}`;
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

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`mt-1 w-fit rounded px-1.5 py-0.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function StatusBadge({ s, thisYear }: { s: SetCardData; thisYear: number }) {
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

export function SetCard({
  set: s,
  thisYear,
  header,
  action,
}: {
  set: SetCardData;
  thisYear: number;
  /** Optional line above the card body, e.g. "New set · Nov 7". */
  header?: ReactNode;
  /** Optional control in the button row, e.g. the watch ☆ button. */
  action?: ReactNode;
}) {
  const onSale = statusOf(s, thisYear) === "available";
  return (
    <div className="rounded-2xl bg-white p-3 text-zinc-900 shadow">
      {header && <div className="mb-2 text-xs font-semibold text-zinc-500">{header}</div>}
      <div className="flex gap-3">
        <RemoteImage src={s.image_url} alt={s.name} className="h-20 w-24 shrink-0 rounded-lg" />
        <div className="flex flex-col justify-center">
          <span className="font-bold leading-tight">{s.name}</span>
          <span className="text-sm text-zinc-500">
            #{s.set_num.replace(/-1$/, "")} · {s.year} ·{" "}
            {s.num_parts > 0 ? `${s.num_parts.toLocaleString()} pieces` : "pieces TBA"}
          </span>
          <StatusBadge s={s} thisYear={thisYear} />
        </div>
      </div>
      {/* Separate links side by side (a link can't contain another link). */}
      <div className="mt-3 flex items-center gap-3">
        <a
          href={legoComUrl(s.set_num)}
          target="_blank"
          rel="noreferrer"
          className={`flex-1 rounded-xl px-3 py-2 text-center text-sm font-bold ${
            onSale ? "bg-brick text-navy" : "bg-navy text-white"
          }`}
        >
          {onSale ? "Buy on LEGO.com ↗" : "View on LEGO.com ↗"}
        </a>
        {action}
        {s.source_url && (
          <a
            href={s.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-500 underline"
          >
            Details
          </a>
        )}
      </div>
    </div>
  );
}
