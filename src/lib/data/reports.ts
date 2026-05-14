import { supabaseBrowser } from "@/lib/supabase";
import type { ReportRow } from "@/lib/data/types";

export async function listReports(projectId: string): Promise<ReportRow[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function getReport(id: string): Promise<ReportRow | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as ReportRow | null) ?? null;
}

export async function createReport(input: {
  projectId: string;
  name: string;
  description?: string;
  cadence: "weekly" | "monthly";
}): Promise<ReportRow> {
  const supabase = supabaseBrowser();

  const schedule =
    input.cadence === "weekly"
      ? "Mon · 08:00 UTC"
      : "1st of month · 08:00 UTC";

  const { data, error } = await supabase
    .from("reports")
    .insert({
      project_id: input.projectId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      cadence: input.cadence,
      schedule,
      scope_kind: "project",
      status: "draft",
      is_featured: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ReportRow;
}
