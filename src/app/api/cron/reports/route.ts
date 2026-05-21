import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isCronAuthorised } from "@/lib/cron-auth";
import { buildReportSnapshot } from "@/lib/data/report-snapshot";
import { renderReportEmail } from "@/lib/email/report-email";
import { sendMail } from "@/lib/email/transport";
import {
  detectSource,
  finishScrapeRun,
  startScrapeRun,
} from "@/lib/data/scrape-runs";

export const maxDuration = 60;

const ROUTE = "/api/cron/reports";

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
  const source = detectSource(request);
  const runStartMs = Date.now();
  const runId = await startScrapeRun(admin, {
    source,
    route: ROUTE,
    notes: {
      force: body.force ?? false,
      dryRun: body.dryRun ?? false,
    },
  });

  const { data: reports, error } = await admin
    .from("reports")
    .select("id, name, description, cadence, status, project_id")
    .eq("status", "active");
  if (error) {
    await finishScrapeRun(admin, runId, {
      status: "failed",
      errorMessage: error.message,
      startedAt: runStartMs,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // App URL backs the "View report online" CTA. Use the explicit env
  // value when set (production), otherwise derive from the request
  // origin (preview deploys + local dev).
  const appUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(request.url).origin;

  type Result = {
    reportId: string;
    name: string;
    cadence: string;
    sent: boolean;
    skipped?: string;
    error?: string;
    recipients?: number;
    failedRecipients?: number;
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
      // Snapshot the report at send time. `accounts` (the integer
      // count) stays on the row for fast list rendering; the full
      // payload backs the historical view page AND the email body.
      const payload = await buildReportSnapshot(admin, r.id);

      const nowIso = new Date().toISOString();
      const { error: updErr } = await admin
        .from("reports")
        .update({ last_sent_at: nowIso })
        .eq("id", r.id);
      if (updErr) throw updErr;

      // Insert the history row first WITH the snapshot. We capture
      // the row id so the email link can target ?historyId=<id> and
      // open the exact frozen view the recipient was shown. The
      // recipients count is updated below after the actual sends.
      const { data: histRow, error: histErr } = await admin
        .from("report_history")
        .insert({
          report_id: r.id,
          sent_at: nowIso,
          status: "delivered",
          recipients: 0,
          accounts: payload.totals.account_count,
          payload,
        })
        .select("id")
        .single();
      if (histErr) throw histErr;
      const historyId = histRow.id as string;

      // Pull recipients. report_recipients is project_id-agnostic —
      // RLS would gate it for the browser, but here we're on the
      // service role so the join key is just report_id.
      const { data: recipientRows, error: rcptErr } = await admin
        .from("report_recipients")
        .select("email")
        .eq("report_id", r.id);
      if (rcptErr) throw rcptErr;
      const recipients = (recipientRows ?? []).map(
        (row) => row.email as string,
      );

      let delivered = 0;
      let failed = 0;
      if (recipients.length > 0) {
        const rendered = renderReportEmail({
          reportName: r.name as string,
          reportDescription: (r.description as string | null) ?? null,
          reportId: r.id,
          historyId,
          snapshot: payload,
          appUrl,
        });

        for (const to of recipients) {
          const res = await sendMail({
            to,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });
          if (res.ok) {
            delivered += 1;
          } else {
            failed += 1;
            console.error(
              `[cron/reports] send failed report=${r.id} to=${to} err=${res.error}`,
            );
          }
        }

        // Reflect the delivery outcome on the history row. `failed`
        // only applies when there were recipients but none got
        // through — otherwise we treat the report as delivered with
        // whatever count actually went out.
        const status =
          delivered === 0 ? "failed" : failed > 0 ? "partial" : "delivered";
        await admin
          .from("report_history")
          .update({ recipients: delivered, status })
          .eq("id", historyId);
      }

      results.push({
        reportId: r.id,
        name: r.name as string,
        cadence,
        sent: true,
        recipients: delivered,
        failedRecipients: failed,
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

  const sentCount = results.filter((r) => r.sent).length;
  const failedCount = results.filter((r) => r.error).length;
  await finishScrapeRun(admin, runId, {
    status:
      failedCount === 0
        ? "success"
        : sentCount === 0
          ? "failed"
          : "partial",
    accountsTotal: reports?.length ?? 0,
    accountsOk: sentCount,
    startedAt: runStartMs,
    notes: {
      isMonday,
      isFirstOfMonth,
      skipped: results.filter((r) => r.skipped).length,
    },
  });

  return NextResponse.json({
    runAt: now.toISOString(),
    isMonday,
    isFirstOfMonth,
    totalReports: reports?.length ?? 0,
    sent: sentCount,
    skipped: results.filter((r) => r.skipped).length,
    failed: failedCount,
    source,
    results,
  });
}

