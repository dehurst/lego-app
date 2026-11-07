"use client";

import { useOptimistic, useTransition } from "react";
import { setWatch } from "@/app/watchlist/actions";

/** ☆ / ★ toggle. Flips instantly, saves in the background (like Follow). */
export function WatchButton({ setNum, watching }: { setNum: string; watching: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(watching);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Stop watching this set" : "Watch this set"}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setWatch(setNum, !optimistic);
        })
      }
      className={`rounded-xl px-3 py-2 text-sm font-bold ${
        optimistic ? "bg-yellow-400 text-navy" : "bg-zinc-100 text-zinc-700"
      }`}
    >
      {optimistic ? "★ Watching" : "☆ Watch"}
    </button>
  );
}
