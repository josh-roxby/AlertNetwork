import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 10;

// POST /api/projects/create
//
// Super-admin gated project creation. Originally browser-side via
// the anon client + RLS — but the WITH CHECK clause
// (is_super_admin() AND owner_id = auth.uid()) was misfiring at
// the policy-evaluation layer on the live deployment despite both
// clauses returning true when evaluated outside it. We sidestep
// the whole RLS evaluation by doing the auth check explicitly here
// and writing with the service-role client.
//
// Pattern matches /api/projects/[id]/backfill — both are
// super-admin-only writes that need to bypass RLS deliberately.
export async function POST(request: NextRequest) {
  let body: { name?: string; description?: string } = {};
  try {
    body = (await request.json()) as { name?: string; description?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Project name is required." },
      { status: 400 },
    );
  }
  const description = body.description?.trim() || null;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Super-admin check via the RPC. SECURITY DEFINER bypasses RLS
  // on the super_admins table so this returns a clean true/false.
  const { data: isSuper, error: rpcErr } = await supabase.rpc("is_super_admin");
  if (rpcErr) {
    return NextResponse.json(
      { error: rpcErr.message ?? "Auth check failed." },
      { status: 500 },
    );
  }
  if (isSuper !== true) {
    return NextResponse.json(
      { error: "Only the super admin can create projects." },
      { status: 403 },
    );
  }

  // Service-role insert — bypasses the WITH CHECK clause that was
  // misfiring. We still own the data integrity rule here: we set
  // owner_id to the caller's user.id ourselves, so the project
  // ends up correctly attributed.
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("projects")
    .insert({
      owner_id: user.id,
      name,
      description,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to create project." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, project: data });
}
