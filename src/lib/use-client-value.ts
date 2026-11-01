"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Reads a browser-only value without a hydration mismatch.
 * During server rendering (and the very first client render) it returns
 * `null`; after that it returns `read()`.
 *
 * `read()` must return the same value each call (a string/number, or a
 * cached object). A new object every call makes React re-render forever.
 */
export function useClientValue<T>(read: () => T): T | null {
  return useSyncExternalStore(noopSubscribe, read, () => null);
}
