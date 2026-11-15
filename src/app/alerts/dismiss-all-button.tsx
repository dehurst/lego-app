"use client";

import { useFormStatus } from "react-dom";

/** Submit button for "Dismiss all" that asks first, since it clears the inbox. */
export function DismissAllButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(`Dismiss all ${count} alerts?`)) e.preventDefault();
      }}
      className="w-full rounded-xl bg-white/10 px-4 py-3 font-bold text-zinc-200 disabled:opacity-40"
    >
      {pending ? "Dismissing…" : "Dismiss all"}
    </button>
  );
}
