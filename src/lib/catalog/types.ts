// The shape of catalog data, independent of where it comes from.
// Rebrickable fills these today; Brickset can fill the availability fields
// later without the rest of the app changing.

export type CatalogTheme = {
  id: number;
  parentId: number | null;
  name: string;
};

export type CatalogSet = {
  setNum: string; // "75301-1"
  name: string;
  year: number;
  themeId: number;
  numParts: number; // 0 = unknown (typical for just-announced sets)
  imageUrl: string | null;
  sourceUrl: string | null;
  sourceModifiedAt: string | null;
};

export interface CatalogSource {
  fetchThemes(): Promise<CatalogTheme[]>;
  /** Every set from `minYear` onward (current + upcoming sets). */
  fetchSetsSince(minYear: number): Promise<CatalogSet[]>;
}
