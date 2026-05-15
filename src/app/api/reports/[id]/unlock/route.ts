import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyPassword } from "@/lib/password";

export const maxDuration = 10;

// POST /api/reports/[id]/unlock
//
// Public — anyone with a share link plus the password can call this.
// Verifies the password against `reports.password_hash` and, on
// success, sets a short-lived HttpOnly cookie scoped to the report's
// /view path. The page checks for the cookie server-side; missing or
// stale cookies show the password gate.
//
// Service-role client because the public viewer isn't signed in and
// has no Supabase session — RLS would otherwise block the read.

const UNLOCK_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await context.params;

  let body: { password?: string } = {};
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json(
      { error: "Password required." },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();
  const { data: report, error } = await admin
    .from("reports")
    .select("id, password_hash")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!report.password_hash) {
    return NextResponse.json(
      { ok: true, message: "No password set on this report." },
      { status: 200 },
    );
  }
  if (!verifyPassword(body.password, report.password_hash)) {
    return NextResponse.json(
      { error: "Wrong password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: `anw-report-unlock-${reportId}`,
    value: "1",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/reports/${reportId}/view`,
    maxAge: UNLOCK_TTL_SECONDS,
  });
  return response;
}
