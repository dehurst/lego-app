import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { optionalEnv } from "@/lib/env";

// TEMPORARY (M2 only): until real logins exist (M3), the push test endpoints
// are guarded by one shared password, ADMIN_SECRET, set in Vercel.

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** True if the request carries the right `x-admin-secret` header. */
export function hasAdminSecret(request: Request): boolean {
  const expected = optionalEnv("ADMIN_SECRET");
  const given = request.headers.get("x-admin-secret");
  if (!expected || !given) return false;
  // Compare hashes in constant time, so an attacker can't guess the
  // password one character at a time by measuring response speed.
  return timingSafeEqual(digest(expected), digest(given));
}

export function unauthorized(): Response {
  return Response.json({ error: "Wrong or missing test password." }, { status: 401 });
}
