import { APP_TIMEZONE } from "@/lib/env";

// No alerts from 9pm to 7am (Eastern). Anything found overnight waits as
// "pending" and goes out with the first check after 7am.
export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 7;

/** The hour (0–23) right now in the app's time zone. */
export function localHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIMEZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
}

export function isQuietHours(now = new Date()): boolean {
  const hour = localHour(now);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}
