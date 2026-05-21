import { supabaseBrowser } from "@/lib/supabase";
import type { HealthConfig, ProjectRow } from "@/lib/data/types";

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
  // Routed through /api/projects/create — server-side super-admin
  // check + service-role insert. The RLS WITH CHECK clause
  // (is_super_admin() AND owner_id = auth.uid()) was rejecting
  // INSERTs that should have been allowed; the API route bypasses
  // that path entirely while keeping the same auth gate.
  const res = await fetch("/api/projects/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    project?: ProjectRow;
    error?: string;
  };
  if (!res.ok || !body.ok || !body.project) {
    throw new Error(body.error ?? "Couldn't create the project.");
  }
  return body.project;
}

export async function updateProject(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    health_config?: HealthConfig | null;
  },
): Promise<ProjectRow> {
  const supabase = supabaseBrowser();
  const next: Record<string, unknown> = {};
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.description !== undefined) {
    next.description = patch.description?.trim() || null;
  }
  if (patch.health_config !== undefined) {
    next.health_config = patch.health_config;
  }
  const { data, error } = await supabase
    .from("projects")
    .update(next)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ProjectRow;
}
