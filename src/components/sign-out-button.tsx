"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    // Stop alerts on this device first (while we're still logged in), so a
    // logged-out phone never keeps getting someone's notifications.
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } catch {
      // Not fatal: the server cleans up dead subscriptions later anyway.
    }
    await createBrowserSupabase().auth.signOut();
    window.location.replace("/");
  }

  return (
    <button onClick={signOut} disabled={pending} className="text-sm text-zinc-400 underline">
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
