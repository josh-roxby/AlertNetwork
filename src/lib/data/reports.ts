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

export type ReportScope =
  | { kind: "project" }
  | { kind: "category"; categoryIds: string[] }
  | { kind: "account"; accountIds: string[] };

export async function createReport(input: {
  projectId: string;
  name: string;
  description?: string;
  cadence: "weekly" | "monthly";
  scope: ReportScope;
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
      scope_kind: input.scope.kind,
      // Reports start live by default — cron picks them up on the
      // next scheduled day. The Manage sheet flips to Paused if the
      // user wants to skip a cycle.
      status: "active",
      is_featured: false,
    })
    .select()
    .single();

  if (error) throw error;
  const report = data as ReportRow;

  await applyReportScope(report.id, input.scope);

  return report;
}

export async function updateReport(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    cadence?: "weekly" | "monthly";
    status?: string;
    is_featured?: boolean;
  },
): Promise<void> {
  const supabase = supabaseBrowser();
  const next: Record<string, unknown> = {};
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.description !== undefined) {
    next.description = patch.description?.trim() || null;
  }
  if (patch.cadence !== undefined) {
    next.cadence = patch.cadence;
    next.schedule =
      patch.cadence === "weekly"
        ? "Mon · 08:00 UTC"
        : "1st of month · 08:00 UTC";
  }
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.is_featured !== undefined) next.is_featured = patch.is_featured;

  const { error } = await supabase.from("reports").update(next).eq("id", id);
  if (error) throw error;
}

export async function deleteReport(id: string): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}

// Replace the scope rows. Called on create + on edit so the join
// tables always match the report's current scope_kind.
export async function applyReportScope(
  reportId: string,
  scope: ReportScope,
): Promise<void> {
  const supabase = supabaseBrowser();
  // Wipe both join tables first to make the call idempotent.
  await supabase.from("report_categories").delete().eq("report_id", reportId);
  await supabase.from("report_accounts").delete().eq("report_id", reportId);

  if (scope.kind === "category" && scope.categoryIds.length > 0) {
    const rows = scope.categoryIds.map((category_id) => ({
      report_id: reportId,
      category_id,
    }));
    const { error } = await supabase.from("report_categories").insert(rows);
    if (error) throw error;
  } else if (scope.kind === "account" && scope.accountIds.length > 0) {
    const rows = scope.accountIds.map((account_id) => ({
      report_id: reportId,
      account_id,
    }));
    const { error } = await supabase.from("report_accounts").insert(rows);
    if (error) throw error;
  }
}

export async function getReportScopeIds(
  reportId: string,
  kind: "category" | "account",
): Promise<string[]> {
  const supabase = supabaseBrowser();
  if (kind === "category") {
    const { data, error } = await supabase
      .from("report_categories")
      .select("category_id")
      .eq("report_id", reportId);
    if (error) throw error;
    return (data ?? []).map((r) => r.category_id as string);
  }
  const { data, error } = await supabase
    .from("report_accounts")
    .select("account_id")
    .eq("report_id", reportId);
  if (error) throw error;
  return (data ?? []).map((r) => r.account_id as string);
}
