import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildReportSnapshot } from "@/lib/data/report-snapshot";

export const maxDuration = 60;

// POST /api/reports/[id]/run-now
//
// Manual trigger from the report Manage sheet — fires the same
// "generate + record" flow as the daily cron but for one report
// regardless of cadence / day-of-week. Stamps `last_sent_at` and
// inserts a `report_history` row marking it delivered. Counts the
// scoped accounts for the summary.
//
// Marked dev-only in the UI; the real send pipeline replaces it once
// SMTP is wired.
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await context.params;

  // Ownership check via the user's session — RLS gates the read.
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: report, error } = await supabase
    .from("reports")
    .select("id, name, scope_kind, project_id")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Service role for the writes — keeps a single code path with the
  // cron route.
  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();

  try {
    const payload = await buildReportSnapshot(admin, reportId);

    const { error: updErr } = await admin
      .from("reports")
      .update({ last_sent_at: nowIso })
      .eq("id", reportId);
    if (updErr) throw updErr;

    const { error: histErr } = await admin.from("report_history").insert({
      report_id: reportId,
      sent_at: nowIso,
      status: "delivered",
      recipients: 0,
      accounts: payload.totals.account_count,
      payload,
    });
    if (histErr) throw histErr;

    return NextResponse.json({
      ok: true,
      reportId,
      name: report.name,
      sentAt: nowIso,
      accounts: payload.totals.account_count,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
