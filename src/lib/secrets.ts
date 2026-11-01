import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** Compare two secrets in constant time (no timing hints for attackers). */
export function safeEqual(a: string, b: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

// No look-alike characters (0/O, 1/I/L) so codes are easy to read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomChars(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** e.g. "BRICK-7KQ3-9XPA" */
export function newInviteCode(): string {
  return `BRICK-${randomChars(4)}-${randomChars(4)}`;
}

/** e.g. "tq7m-8ka3-wp2x": easy to type on a phone, ~60 bits of randomness. */
export function newTempPassword(): string {
  return [randomChars(4), randomChars(4), randomChars(4)].join("-").toLowerCase();
}
