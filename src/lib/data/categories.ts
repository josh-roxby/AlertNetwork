import { supabaseBrowser } from "@/lib/supabase";
import type { CategoryRow } from "@/lib/data/types";

// Eight default categories seeded on project creation. `palette_id`
// matches the CSS variable name used by the UI (`--cat-fashion`,
// `--cat-food`, …) so colours stay consistent without extra mapping.
export const DEFAULT_CATEGORIES: { label: string; palette_id: string }[] = [
  { label: "Fashion", palette_id: "fashion" },
  { label: "Food", palette_id: "food" },
  { label: "Beauty", palette_id: "beauty" },
  { label: "Tech", palette_id: "tech" },
  { label: "Sports", palette_id: "sports" },
  { label: "Music", palette_id: "music" },
  { label: "Travel", palette_id: "travel" },
  { label: "Lifestyle", palette_id: "lifestyle" },
];

// Palettes a user-created category cycles through. Reuses the same
// eight CSS variable buckets as the defaults — adding a ninth category
// wraps back to the first palette.
const PALETTE_CYCLE = DEFAULT_CATEGORIES.map((c) => c.palette_id);

export async function listCategories(
  projectId: string,
): Promise<CategoryRow[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export async function seedDefaultCategories(projectId: string): Promise<void> {
  const supabase = supabaseBrowser();
  const rows = DEFAULT_CATEGORIES.map((c) => ({
    project_id: projectId,
    label: c.label,
    palette_id: c.palette_id,
  }));
  const { error } = await supabase.from("categories").insert(rows);
  if (error) throw error;
}

// Idempotent "find or create" used when the user types a new category
// name in AddAccountSheet. Match is case-insensitive on `label`.
export async function ensureCategory(
  projectId: string,
  label: string,
): Promise<CategoryRow> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Category label cannot be empty");

  const existing = await listCategories(projectId);
  const match = existing.find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return match;

  const palette_id = PALETTE_CYCLE[existing.length % PALETTE_CYCLE.length];

  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("categories")
    .insert({ project_id: projectId, label: trimmed, palette_id })
    .select()
    .single();

  if (error) throw error;
  return data as CategoryRow;
}
