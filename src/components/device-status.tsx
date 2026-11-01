"use client";

import { useEffect, useState } from "react";
import { isStandalone } from "@/lib/device";
import { useClientValue } from "@/lib/use-client-value";

// A small "is everything working?" panel for testing on real devices.
// We'll keep it around (maybe behind an admin flag) because it's handy
// when a friend says "my alerts don't work".

type StaticInfo = {
  installed: boolean;
  pushSupported: boolean;
  permission: string;
};

// useSyncExternalStore needs the SAME object back each time it asks, or React
// thinks the value changed and re-renders forever. So we read once and cache.
let cached: StaticInfo | null = null;

function readStatic(): StaticInfo {
  return (cached ??= {
    installed: isStandalone(),
    pushSupported: "PushManager" in window && "Notification" in window,
    permission: "Notification" in window ? Notification.permission : "n/a",
  });
}

export function DeviceStatus() {
  const info = useClientValue(readStatic);
  const [swState, setSwState] = useState("checking…");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setSwState("not supported"); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    navigator.serviceWorker.ready.then((reg) =>
      setSwState(reg.active ? "active" : "installing"),
    );
  }, []);

  if (!info) return null;

  const rows: [string, string, boolean][] = [
    ["Opened from Home Screen", info.installed ? "yes" : "no", info.installed],
    ["Service worker", swState, swState === "active"],
    ["Push supported here", info.pushSupported ? "yes" : "no", info.pushSupported],
    ["Notification permission", info.permission, info.permission === "granted"],
  ];

  return (
    <section className="w-full max-w-sm rounded-2xl bg-white/10 p-4 text-left text-sm text-zinc-100">
      <h2 className="mb-2 font-semibold text-brick">Device check</h2>
      <ul className="space-y-1">
        {rows.map(([label, value, good]) => (
          <li key={label} className="flex justify-between gap-4">
            <span>{label}</span>
            <span className={good ? "text-green-400" : "text-zinc-400"}>
              {good ? "✓ " : ""}
              {value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
