// Theme rules that aren't in the API data: what to hide and what to rename.

// Top-level themes that aren't building sets (keychains, shoe charms, books,
// promo giveaways, classroom kits…). Matched by name, ignoring case.
const HIDDEN_ROOT_THEMES = new Set(
  [
    "Books",
    "Bulk Bricks",
    "Clikits",
    "Educational and Dacta",
    "FIRST LEGO League",
    "Games",
    "Gear",
    "LEGO Brand Store",
    "Legoland",
    "Legoland Parks",
    "Other",
    "Promotional",
    "Service Packs",
  ].map((name) => name.toLowerCase()),
);

export function isHiddenRootTheme(name: string): boolean {
  return HIDDEN_ROOT_THEMES.has(name.toLowerCase());
}

// Kid-friendly names for themes whose official names are clunky.
const DISPLAY_NAMES: Record<string, string> = {
  "Super Heroes Marvel": "Marvel",
  "Super Heroes DC": "DC",
  "LEGO Ideas and CUUSOO": "Ideas",
  "Collectible Minifigures": "Minifigures",
  "LEGO Art": "Art",
};

export function displayThemeName(name: string): string {
  return DISPLAY_NAMES[name] ?? name;
}
