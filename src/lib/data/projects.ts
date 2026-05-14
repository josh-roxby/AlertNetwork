import { supabaseBrowser } from "@/lib/supabase";
import type { ProjectRow } from "@/lib/data/types";
import { seedDefaultCategories } from "@/lib/data/categories";

export async function listProjects(): Promise<ProjectRow[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProjectRow[];
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

  // Seed the eight default categories so the project is immediately
  // usable. If seeding fails the project still exists — surface the
  // error so the UI can prompt the user to retry; categories can also
  // be created on demand from AddAccountSheet.
  await seedDefaultCategories(data.id);

  return data as ProjectRow;
}
