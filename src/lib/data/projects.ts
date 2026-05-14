import { supabaseBrowser } from "@/lib/supabase";
import type { ProjectRow } from "@/lib/data/types";

export async function listProjects(): Promise<ProjectRow[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  const projects = (data ?? []) as ProjectRow[];

  // Hydrate account counts in parallel. Each query is a HEAD with an
  // exact count — no rows transferred. RLS gates to the caller's
  // accounts so private projects from other users never leak in.
  const withCounts = await Promise.all(
    projects.map(async (p) => {
      const { count } = await supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("project_id", p.id);
      return { ...p, account_count: count ?? 0 };
    }),
  );
  return withCounts;
}

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<ProjectRow> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectRow;
}
