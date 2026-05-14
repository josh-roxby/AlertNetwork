import { supabaseBrowser } from "@/lib/supabase";
import type { TagRow } from "@/lib/data/types";

export async function listTags(projectId: string): Promise<TagRow[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("project_id", projectId)
    .order("label", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TagRow[];
}

// Idempotent "find or create" — returns the existing row when the
// label already exists for this project (case-insensitive).
export async function ensureTag(
  projectId: string,
  label: string,
): Promise<TagRow> {
  const trimmed = label.trim().replace(/^#/, "");
  if (!trimmed) throw new Error("Tag label cannot be empty");

  const existing = await listTags(projectId);
  const match = existing.find(
    (t) => t.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return match;

  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("tags")
    .insert({ project_id: projectId, label: trimmed })
    .select()
    .single();

  if (error) throw error;
  return data as TagRow;
}

// Replace the full set of tags on an account. Used by AddAccountSheet
// and EditAccountSheet (M-3b.2). Drops removed tags + inserts new ones.
export async function setAccountTags(
  accountId: string,
  tagIds: string[],
): Promise<void> {
  const supabase = supabaseBrowser();

  const { error: delError } = await supabase
    .from("account_tags")
    .delete()
    .eq("account_id", accountId);
  if (delError) throw delError;

  if (tagIds.length === 0) return;

  const rows = tagIds.map((tag_id) => ({ account_id: accountId, tag_id }));
  const { error: insError } = await supabase.from("account_tags").insert(rows);
  if (insError) throw insError;
}
