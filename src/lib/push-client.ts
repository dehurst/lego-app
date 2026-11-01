// Browser-side push helpers.

export const PUSH_CHANGED_EVENT = "brickdrop:push-changed";

/** Tell other components (like the device check) that push state changed. */
export function announcePushChange() {
  window.dispatchEvent(new Event(PUSH_CHANGED_EVENT));
}

/** VAPID public keys are base64url text; the browser wants raw bytes. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function api(
  path: string,
  method: "POST" | "DELETE",
  body: unknown,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json" }, // session cookie is sent automatically
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}
