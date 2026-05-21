import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/password";

export const maxDuration = 10;

// POST /api/reports/[id]/password
//
// Owner-only mutation that sets or clears the report's password.
// Body shape:
//   { password: "..." }     // set
//   { password: null }      // clear
//
// Hashing runs server-side (scrypt) — the plaintext never lands in
// the DB. RLS gates the ownership check via the Supabase session
// client; the actual write uses the service role since password_hash
// isn't otherwise meant to round-trip through the browser.

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await context.params;

  let body: { password?: string | null } = {};
  try {
    body = (await request.json()) as { password?: string | null };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // RLS now lets viewers SELECT reports too, so verify the caller is
  // the project owner before mutating the password hash via admin.
  const { data: report, error: ownErr } = await supabase
    .from("reports")
    .select("id, project_id")
    .eq("id", reportId)
    .maybeSingle();
  if (ownErr || !report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { data: ownerCheck } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", report.project_id)
    .maybeSingle();
  if (!ownerCheck || ownerCheck.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the project owner can change the report password." },
      { status: 403 },
    );
  }

  // Clear password
  if (body.password === null || body.password === "") {
    const admin = supabaseAdmin();
    const { error } = await admin
      .from("reports")
      .update({ password_hash: null })
      .eq("id", reportId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, hasPassword: false });
  }

  // Set password — must be at least 4 chars to dodge accidental empties.
  if (typeof body.password !== "string" || body.password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 },
    );
  }

  const password_hash = hashPassword(body.password);
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("reports")
    .update({ password_hash })
    .eq("id", reportId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, hasPassword: true });
}
