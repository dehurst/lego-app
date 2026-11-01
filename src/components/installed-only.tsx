"use client";

import type { ReactNode } from "react";
import { isIOS, isStandalone } from "@/lib/device";
import { useClientValue } from "@/lib/use-client-value";

/**
 * On iPhone/iPad, only shows its children inside the installed Home Screen
 * app. Why: the Home Screen app keeps its own separate cookies from Safari,
 * so logging in inside a Safari tab wouldn't log you in to the app.
 * (The install guide is shown instead.) Computers see the children normally.
 */
export function InstalledOnly({ children }: { children: ReactNode }) {
  const allowed = useClientValue(() => !isIOS() || isStandalone());
  return allowed ? <>{children}</> : null;
}
