import type { PushPayload } from "@/lib/push";

export type AlertKind = "new_set" | "now_available" | "back_in_stock";

export type AlertItem = {
  kind: AlertKind;
  setNum: string;
  setName: string;
  year: number;
  themeId: number;
  themeName: string;
  rrpUsd: number | null;
};

const shortNum = (setNum: string) => setNum.replace(/-1$/, "");
const price = (usd: number | null) => (usd ? ` · $${usd.toFixed(2)}` : "");

function listNames(names: string[], max: number): string {
  const shown = names.slice(0, max).join(", ");
  return names.length > max ? `${shown} and ${names.length - max} more` : shown;
}

function newSetMessage(items: AlertItem[], thisYear: number): PushPayload {
  const themes = [...new Set(items.map((i) => i.themeName))];
  if (items.length === 1) {
    const s = items[0];
    return {
      title: `🧱 New ${s.themeName} set!`,
      body: `${s.setName} (#${shortNum(s.setNum)})${s.year > thisYear ? `, coming ${s.year}` : ""}`,
      url: `/themes/${s.themeId}`,
    };
  }
  if (themes.length === 1) {
    return {
      title: `🧱 ${items.length} new ${themes[0]} sets`,
      body: listNames(items.map((i) => i.setName), 3),
      url: `/themes/${items[0].themeId}`,
    };
  }
  return { title: `🧱 ${items.length} new LEGO sets`, body: `In ${listNames(themes, 4)}`, url: "/themes" };
}

function nowAvailableMessage(items: AlertItem[]): PushPayload {
  if (items.length === 1) {
    const s = items[0];
    return {
      title: `🛒 Now in stores: ${s.setName}`,
      body: `${s.themeName} #${shortNum(s.setNum)}${price(s.rrpUsd)}`,
      url: `/themes/${s.themeId}?show=available`,
    };
  }
  return {
    title: `🛒 ${items.length} sets you follow are in stores now`,
    body: listNames(items.map((i) => i.setName), 3),
    url: items.every((i) => i.themeId === items[0].themeId)
      ? `/themes/${items[0].themeId}?show=available`
      : "/themes",
  };
}

/**
 * Turns everything one person is owed right now into ONE notification.
 * Kept short: lock screens cut off long text.
 */
export function buildAlertMessage(items: AlertItem[], thisYear: number): PushPayload {
  const fresh = items.filter((i) => i.kind === "new_set");
  const inStores = items.filter((i) => i.kind !== "new_set");
  if (inStores.length === 0) return newSetMessage(fresh, thisYear);
  if (fresh.length === 0) return nowAvailableMessage(inStores);
  return {
    title: `🧱 ${items.length} LEGO updates`,
    body: `${fresh.length} new set${fresh.length > 1 ? "s" : ""} announced, ${inStores.length} now in stores`,
    url: "/themes",
  };
}
