"use client";

import { useEffect, useState } from "react";
import { isIOS, isStandalone } from "@/lib/device";
import { PUSH_CHANGED_EVENT } from "@/lib/push-client";

/**
 * A loud warning when this device won't get alerts: permission blocked,
 * never turned on, or the subscription went missing. Push is our only
 * channel, so a silently broken device is the worst failure we have.
 */
export function AlertsOffBanner() {
  const [problem, setProblem] = useState<null | "off" | "blocked">(null);

  useEffect(() => {
    async function check() {
      // Only where push can work (on iPhone/iPad: the installed app).
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (isIOS() && !isStandalone()) return;
      if (Notification.permission === "denied") return setProblem("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setProblem(Notification.permission === "granted" && sub ? null : "off");
    }
    void check();
    // Re-check when the alerts card turns alerts on or off.
    window.addEventListener(PUSH_CHANGED_EVENT, check);
    return () => window.removeEventListener(PUSH_CHANGED_EVENT, check);
  }, []);

  if (!problem) return null;
  return (
    <a
      href="#alerts"
      className="w-full max-w-sm rounded-2xl bg-red-600 px-4 py-3 text-left font-semibold text-white shadow-lg"
    >
      🔕 Alerts are {problem === "blocked" ? "blocked" : "off"} on this device.{" "}
      <span className="underline">
        {problem === "blocked" ? "See how to fix it" : "Turn them on"} ↓
      </span>
    </a>
  );
}
