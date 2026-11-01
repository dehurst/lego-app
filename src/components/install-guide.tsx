"use client";

import { Card } from "@/components/card";
import { isIOS, isInAppBrowser, isStandalone } from "@/lib/device";
import { useClientValue } from "@/lib/use-client-value";

type Mode = "installed" | "ios-in-app" | "ios-browser" | "other-browser";

function detectMode(): Mode {
  if (isStandalone()) return "installed";
  if (isIOS()) return isInAppBrowser() ? "ios-in-app" : "ios-browser";
  return "other-browser";
}

/** Share icon drawn to match iOS (square with an arrow pointing up). */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="inline h-5 w-5 align-text-bottom text-blue-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Share"
    >
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

export function InstallGuide() {
  const mode = useClientValue(detectMode);

  // Server render / first paint, or already installed: show nothing.
  if (mode === null || mode === "installed") return null;

  if (mode === "ios-in-app") {
    return (
      <Card title="Open in Safari first">
        <p>
          You&apos;re inside another app&apos;s browser, which can&apos;t
          install Brick Drop. Tap the <b>•••</b> or compass button and choose{" "}
          <b>Open in Safari</b>.
        </p>
      </Card>
    );
  }

  if (mode === "ios-browser") {
    return (
      <Card title="Add Brick Drop to your Home Screen">
        <p className="mb-3">
          iPhone and iPad only send alerts to apps on your Home Screen. It
          takes 10 seconds:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Tap the Share button <ShareIcon /> (if you don&apos;t see it, tap{" "}
            <b>•••</b> first).
          </li>
          <li>
            Scroll down and tap <b>Add to Home Screen</b>. You may need to tap{" "}
            <b>View More</b>.
          </li>
          <li>
            Make sure <b>Open as Web App</b> is on, then tap <b>Add</b>.
          </li>
          <li>
            Close Safari and open <b>Brick Drop</b> from your Home Screen.
          </li>
        </ol>
      </Card>
    );
  }

  return (
    <Card title="Best on iPhone or iPad">
      <p>
        Open this page in Safari on your iPhone or iPad and add it to your Home
        Screen to get alerts.
      </p>
    </Card>
  );
}
