"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { deleteMyAccount } from "./actions";

export function DeleteAccountButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm(
        "Delete your Brick Drop account? Your themes, watchlist and alerts are erased. This can't be undone.",
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);

    // Turn off alerts on this device first, while still logged in.
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
    } catch {
      /* the server deletes the device record anyway */
    }

    const result = await deleteMyAccount();
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    await createBrowserSupabase().auth.signOut().catch(() => {});
    window.location.replace("/");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
