import "server-only";

// All secrets come from environment variables (set in .env.local locally,
// and in the Vercel dashboard for production). Nothing secret is committed.

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/New_York";

/** Returns the value of a required env var, or null if it isn't set yet. */
export function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : null;
}

/** Returns the value of a required env var, or throws a clear error. */
export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}
