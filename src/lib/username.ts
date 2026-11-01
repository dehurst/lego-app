// Usernames are the only identity we collect. Shared by browser and server.

export const USERNAME_RULES = "3–20 characters: lowercase letters, numbers or _";
export const PASSWORD_MIN = 8;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

/**
 * Supabase logins need an email-shaped name. We never collect real emails,
 * so each username maps to a fake address on a reserved domain (`.invalid`
 * can never be a real website or mailbox). Nothing is ever sent to it.
 *
 * DON'T CHANGE THIS once people have accounts — their logins depend on it.
 */
export function usernameToLoginEmail(username: string): string {
  return `${username}@users.brickdrop.invalid`;
}
