"use client";

import { useEffect } from "react";
import { markAlertsSeen } from "./actions";

/**
 * Marks alerts as read once the inbox is actually on screen. This runs in
 * the browser on purpose: if the server marked them while rendering, a
 * background prefetch of this page would clear your unread count before
 * you ever looked.
 */
export function MarkSeen() {
  useEffect(() => {
    void markAlertsSeen();
    // Clear the red number on the Home Screen icon too.
    void navigator.clearAppBadge?.().catch(() => {});
  }, []);
  return null;
}
