import type { PushPayload } from "@/lib/push";

export type AlertItem = {
  setNum: string;
  setName: string;
  year: number;
  themeId: number;
  themeName: string;
};

const shortNum = (setNum: string) => setNum.replace(/-1$/, "");

function listNames(names: string[], max: number): string {
  const shown = names.slice(0, max).join(", ");
  return names.length > max ? `${shown} and ${names.length - max} more` : shown;
}

/**
 * Turns everything one person is owed right now into ONE notification.
 * Kept short: lock screens cut off long text.
 */
export function buildNewSetMessage(items: AlertItem[], thisYear: number): PushPayload {
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

  return {
    title: `🧱 ${items.length} new LEGO sets`,
    body: `In ${listNames(themes, 4)}`,
    url: "/themes",
  };
}
