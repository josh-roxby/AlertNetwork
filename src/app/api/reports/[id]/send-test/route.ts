import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildReportSnapshot } from "@/lib/data/report-snapshot";
import { renderReportEmail } from "@/lib/email/report-email";
import { sendMail } from "@/lib/email/transport";

export const maxDuration = 60;

// POST /api/reports/[id]/send-test
//
// Sends a test copy of this report to <email>. Unlike the cron path
// this does NOT create a `report_history` row — it's purely a "what
// would the recipient see right now" preview. The snapshot is built
// on-demand and the email links back to the live /view URL (no
// historyId) since the snapshot isn't persisted.
//
// Owner-gated via the user session (RLS on the read), same as before.

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await context.params;

  let body: { email?: string } = {};
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    // empty body handled below
  }

  const email = body.email?.trim();
  if (!email || !/^.+@.+\..+/.test(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: report, error } = await supabase
    .from("reports")
    .select("id, name, description, project_id")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Owner-only — the snapshot + send below run with service-role and
  // would otherwise let a viewer trigger an email.
  const { data: ownerCheck } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", report.project_id)
    .maybeSingle();
  if (!ownerCheck || ownerCheck.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the project owner can send test emails." },
      { status: 403 },
    );
  }

  const appUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(request.url).origin;

  try {
    // Build a fresh snapshot for the preview — service role bypasses
    // RLS the same way the cron path does. Test sends intentionally
    // don't persist this; the user is testing the layout, not
    // generating an archived send.
    const admin = supabaseAdmin();
    const payload = await buildReportSnapshot(admin, reportId);

    const rendered = renderReportEmail({
      reportName: report.name as string,
      reportDescription: (report.description as string | null) ?? null,
      reportId,
      historyId: null,
      snapshot: payload,
      appUrl,
    });

    const result = await sendMail({
      to: email,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "SMTP send failed" },
        { status: 502 },
      );
    }

    console.info(
      `[reports/send-test] sent "${report.name}" to ${email} ` +
        `(requested by ${user.email}) messageId=${result.messageId}`,
    );

    return NextResponse.json({
      ok: true,
      sentTo: email,
      messageId: result.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
