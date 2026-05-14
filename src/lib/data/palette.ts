// Maps a category's `palette_id` to the Tailwind background class. The
// eight defaults seeded on project creation use the same eight buckets
// (`fashion`, `food`, …) so this lookup is exhaustive for the v1 set.
// Unknown / user-created palettes fall back to a neutral grey dot.

export const PALETTE_BG: Record<string, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

export function paletteBg(paletteId: string | null | undefined): string {
  if (!paletteId) return "bg-ink-4";
  return PALETTE_BG[paletteId] ?? "bg-ink-4";
}
