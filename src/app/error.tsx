"use client"; // Error pages must run in the browser.

import Link from "next/link";
import { useEffect } from "react";

/**
 * Shown when something unexpected breaks while loading a page.
 * (In this Next.js version the "try again" function is called `retry`.)
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Shows up in Vercel's logs, so we can see what went wrong.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="text-6xl" aria-hidden>
        🧱💥
      </div>
      <h1 className="text-2xl font-extrabold text-brick">Something broke</h1>
      <p className="max-w-sm text-zinc-300">
        A brick fell out of place. Try again, and if it keeps happening, tell the admin what you
        tapped.
      </p>
      <button
        onClick={() => retry()}
        className="rounded-xl bg-brick px-6 py-3 text-lg font-bold text-navy"
      >
        Try again
      </button>
      <Link href="/" className="text-zinc-400 underline">
        Go home
      </Link>
    </main>
  );
}
