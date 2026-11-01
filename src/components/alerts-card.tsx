"use client";

import { useEffect, useState } from "react";
import { deviceLabel, isIOS, isStandalone } from "@/lib/device";
import { announcePushChange, api, urlBase64ToUint8Array } from "@/lib/push-client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Status =
  | "loading"
  | "hidden" // push not possible here (e.g. iPhone Safari tab: install guide shows instead)
  | "off"
  | "on"
  | "denied";

export function AlertsCard() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // On load: figure out where this device stands.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // On iPhone/iPad, push only works from the Home Screen app. In a Safari
      // tab the install guide shows instead of this card.
      const iosTab = isIOS() && !isStandalone();
      if (iosTab || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("hidden");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (cancelled) return;
      if (sub && Notification.permission === "granted") {
        setStatus("on");
        // Re-save quietly each launch. If iOS ever rotated the subscription
        // or the row was cleaned up, this heals it without anyone noticing.
        void api("/api/push/subscribe", "POST", {
          subscription: sub.toJSON(),
          deviceLabel: deviceLabel(),
        });
      } else {
        setStatus("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setMessage(null);
    // iOS rule: requestPermission must be the FIRST thing that happens after
    // the tap. Any await before it and iOS treats it as "not from a tap"
    // and silently refuses to show the prompt.
    const permission = await Notification.requestPermission();
    announcePushChange();
    if (permission === "denied") return setStatus("denied");
    if (permission !== "granted") return setMessage("No problem — tap again whenever you're ready.");

    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true, // promise to always show a notification (required)
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const res = await api("/api/push/subscribe", "POST", {
        subscription: sub.toJSON(),
        deviceLabel: deviceLabel(),
      });
      if (!res.ok) {
        // Keep phone and server in agreement: if the server didn't save it,
        // don't leave a half-on subscription on the phone.
        await sub.unsubscribe();
        setMessage(String(res.data.error ?? "Couldn't save. Try again."));
        return;
      }
      setStatus("on");
      setMessage("Alerts are on for this device. Try a test!");
    } catch (err) {
      setMessage(`Something went wrong: ${err instanceof Error ? err.message : err}`);
    } finally {
      setBusy(false);
      announcePushChange();
    }
  }

  async function sendTest(delaySeconds: number) {
    setBusy(true);
    setMessage(
      delaySeconds
        ? `Sending in ${delaySeconds} seconds. Lock your phone now! 🔒`
        : "Sending…",
    );
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setStatus("off");
        return setMessage("This device isn't subscribed anymore. Turn alerts on again.");
      }
      const res = await api("/api/push/test", "POST", {
        endpoint: sub.endpoint,
        delaySeconds,
      });
      if (res.ok) setMessage("Sent! You should see it in a moment.");
      else if (res.data.status === "expired") {
        setStatus("off");
        setMessage("Apple says this subscription expired. Turn alerts on again.");
      } else setMessage(`Test failed: ${String(res.data.error ?? res.status)}`);
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api("/api/push/subscribe", "DELETE", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStatus("off");
      setMessage("Alerts are off for this device.");
    } finally {
      setBusy(false);
      announcePushChange();
    }
  }

  if (status === "loading" || status === "hidden") return null;

  return (
    <section className="w-full max-w-sm rounded-2xl bg-white p-5 text-left text-zinc-800 shadow-lg">
      <h2 className="mb-2 text-lg font-bold text-zinc-900">Alerts</h2>

      {!VAPID_PUBLIC_KEY && (
        <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
          Push isn&apos;t configured yet: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.
        </p>
      )}

      {status === "denied" && (
        <p>
          Alerts are blocked for Brick Drop. To fix it, open the iPhone{" "}
          <b>Settings</b> app → <b>Notifications</b> → <b>Brick Drop</b> → turn
          on <b>Allow Notifications</b>. Then come back here.
        </p>
      )}

      {status === "off" && (
        <>
          <p className="mb-3">
            Get a notification when new LEGO sets drop in themes you follow.
          </p>
          <button
            onClick={turnOn}
            disabled={busy || !VAPID_PUBLIC_KEY}
            className="w-full rounded-xl bg-brick px-4 py-3 text-lg font-bold text-navy disabled:opacity-40"
          >
            {busy ? "Turning on…" : "🔔 Turn on alerts"}
          </button>
        </>
      )}

      {status === "on" && (
        <>
          <p className="mb-3 font-medium text-green-700">✓ Alerts are on for this {deviceLabel()}.</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => sendTest(0)}
              disabled={busy}
              className="rounded-xl bg-brick px-4 py-3 font-bold text-navy disabled:opacity-40"
            >
              Send me a test now
            </button>
            <button
              onClick={() => sendTest(10)}
              disabled={busy}
              className="rounded-xl bg-navy px-4 py-3 font-bold text-white disabled:opacity-40"
            >
              Test in 10s (lock your phone)
            </button>
            <button
              onClick={turnOff}
              disabled={busy}
              className="mt-1 text-sm text-zinc-500 underline"
            >
              Turn off alerts on this device
            </button>
          </div>
        </>
      )}

      {message && <p className="mt-3 text-sm text-zinc-600" role="status">{message}</p>}
    </section>
  );
}
