import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const maxDuration = 30;

// POST /api/reports/[id]/send-test
//
// "Send a test version of this report to <email>". SMTP isn't wired
// yet — when it is (N-4) this route will compose the HTML email and
// hand it to the configured provider. For now it validates the
// payload + ownership, logs the attempt, and returns a clear
// "not-yet-implemented" message so the user knows their click
// reached the server.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await context.params;

  let body: { email?: string } = {};
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    // fall through — empty body is handled below
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
    .select("id, name")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Log for Vercel function visibility so the user can confirm the
  // route was reached even though no email leaves the building yet.
  console.info(
    `[reports/send-test] would send "${report.name}" to ${email} (requested by ${user.email})`,
  );

  return NextResponse.json(
    {
      ok: false,
      pending: true,
      message:
        "Email delivery isn't wired yet. The request reached the server and would dispatch to " +
        email +
        " once SMTP is configured.",
    },
    { status: 202 },
  );
}
