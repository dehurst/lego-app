// Small helpers for figuring out what kind of device/browser we're in.
// Only call these in the browser (inside effects or client-only hooks).

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ pretends to be a Mac, so also check for a touch screen.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

/** True when opened from the home screen icon (not a Safari tab). */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Older iOS versions use this non-standard flag instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Apps like Instagram/Facebook open links in their own mini-browser,
 *  which can't add to the home screen. */
export function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|GSA\//.test(
    navigator.userAgent,
  );
}
