import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isCronAuthorised } from "@/lib/cron-auth";

export const maxDuration = 60;

// /api/cron/reports
//
// Daily trigger — Vercel Cron (GET, see vercel.json) and the GitHub
// Actions workflow (POST). Picks reports due "today" by cadence:
//   - weekly  → Monday (UTC)
//   - monthly → 1st (UTC)
// For each due report, stamps `last_sent_at` and inserts a
// `report_history` row marking it as delivered. Actual email sending
// lands later — for now this is the "generation" event that decouples
// the cron schedule from the scrape (reports compile from already-
// persisted posts; they don't trigger a scrape).

type Body = { dryRun?: boolean; force?: boolean };

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  if (!isCronAuthorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Body is only honoured on POST (GET has no body in Vercel Cron).
  // Vercel Cron is a regular run; dry-run / force flags stay
  // POST-only via the GitHub workflow or curl.
  let body: Body = {};
  if (request.method === "POST") {
    body = (await request.json().catch(() => ({}))) as Body;
  }

  // UTC day-of-week + day-of-month determine which cadences run today.
  // `force` bypasses the date check (for manual workflow_dispatch) and
  // sends every active report.
  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const isFirstOfMonth = now.getUTCDate() === 1;

  const admin = supabaseAdmin();
  const { data: reports, error } = await admin
    .from("reports")
    .select("id, name, cadence, status, project_id")
    .eq("status", "active");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Result = {
    reportId: string;
    name: string;
    cadence: string;
    sent: boolean;
    skipped?: string;
    error?: string;
  };

  const results: Result[] = [];
  for (const r of reports ?? []) {
    const cadence = r.cadence as "weekly" | "monthly";

    let due = false;
    if (body.force) due = true;
    else if (cadence === "weekly" && isMonday) due = true;
    else if (cadence === "monthly" && isFirstOfMonth) due = true;

    if (!due) {
      results.push({
        reportId: r.id,
        name: r.name as string,
        cadence,
        sent: false,
        skipped:
          cadence === "weekly"
            ? "not Monday (UTC)"
            : "not 1st of month (UTC)",
      });
      continue;
    }

    if (body.dryRun) {
      results.push({
        reportId: r.id,
        name: r.name as string,
        cadence,
        sent: false,
        skipped: "dry run",
      });
      continue;
    }

    try {
      // Count accounts the report covers — used in report_history for
      // a quick "X accounts" summary. For scope=project this is every
      // account in the project; for category/account scopes it's the
      // join table size.
      const scoped = await countScopedAccounts(admin, r.id);

      const nowIso = new Date().toISOString();
      const { error: updErr } = await admin
        .from("reports")
        .update({ last_sent_at: nowIso })
        .eq("id", r.id);
      if (updErr) throw updErr;

      const { error: histErr } = await admin.from("report_history").insert({
        report_id: r.id,
        sent_at: nowIso,
        status: "delivered",
        recipients: 0,
        accounts: scoped,
      });
      if (histErr) throw histErr;

      results.push({
        reportId: r.id,
        name: r.name as string,
        cadence,
        sent: true,
      });
    } catch (err) {
      results.push({
        reportId: r.id,
        name: r.name as string,
        cadence,
        sent: false,
        error: err instanceof Error ? err.message : "send failed",
      });
    }
  }

  return NextResponse.json({
    runAt: now.toISOString(),
    isMonday,
    isFirstOfMonth,
    totalReports: reports?.length ?? 0,
    sent: results.filter((r) => r.sent).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => r.error).length,
    results,
  });
}

async function countScopedAccounts(
  admin: ReturnType<typeof supabaseAdmin>,
  reportId: string,
): Promise<number> {
  const { data: report, error: rErr } = await admin
    .from("reports")
    .select("scope_kind, project_id")
    .eq("id", reportId)
    .single();
  if (rErr || !report) return 0;

  if (report.scope_kind === "project") {
    const { count } = await admin
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .eq("project_id", report.project_id);
    return count ?? 0;
  }
  if (report.scope_kind === "account") {
    const { count } = await admin
      .from("report_accounts")
      .select("*", { count: "exact", head: true })
      .eq("report_id", reportId);
    return count ?? 0;
  }
  if (report.scope_kind === "category") {
    // Sum the account counts of every scoped category.
    const { data: rc } = await admin
      .from("report_categories")
      .select("category_id")
      .eq("report_id", reportId);
    if (!rc || rc.length === 0) return 0;
    const categoryIds = rc.map((r) => r.category_id as string);
    const { count } = await admin
      .from("accounts")
      .select("*", { count: "exact", head: true })
      .in("category_id", categoryIds);
    return count ?? 0;
  }
  return 0;
}
