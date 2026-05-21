import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 30;

// POST /api/projects/[id]/members
//
// Invite an email address as a viewer on this project.
//
//   1. Verify the caller owns the project (RLS-gated read on
//      `projects`).
//   2. Resolve the email to an auth.users row — invite first; on
//      "already exists" fall back to listing users.
//   3. Upsert a `project_members` row tying that user to the project
//      as a viewer.
//
// Two terminal states:
//   - Supabase sends a magic-link invite email (new user)
//   - User already exists; we just add them to the project (no email
//     from Supabase — we tell the owner so they can share the URL)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;

  let body: { email?: string; role?: string } = {};
  try {
    body = (await request.json()) as { email?: string; role?: string };
  } catch {
    // empty body handled below
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^.+@.+\..+/.test(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }
  const role: "viewer" | "manager" =
    body.role === "manager" ? "manager" : "viewer";

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Owner check — RLS would also block the insert, but we want a
  // clean 403 with a useful message rather than a generic policy
  // failure.
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the project owner can invite members." },
      { status: 403 },
    );
  }

  if (email === user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "You're already the project owner." },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();

  // Try to create the user via Supabase Invite. This emits a
  // magic-link email AND inserts an auth.users row in one step.
  // If the user already exists Supabase returns an error — fall
  // through and look them up.
  type Outcome = "invited" | "existing";
  let outcome: Outcome = "invited";
  let inviteeUserId: string | null = null;

  const appUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(request.url).origin;

  const { data: invite, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl.replace(/\/$/, "")}/auth/callback`,
    });
  if (invite?.user) {
    inviteeUserId = invite.user.id;
  } else if (
    inviteErr?.message
      ?.toLowerCase()
      .includes("already been registered") ||
    inviteErr?.code === "email_exists"
  ) {
    outcome = "existing";
    // Paginate listUsers until we find the email — Supabase doesn't
    // expose a direct getUserByEmail. 100 per page is the default
    // and our user table is tiny in practice.
    let page = 1;
    while (page <= 5 && !inviteeUserId) {
      const { data: list } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      const match = list?.users.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (match) {
        inviteeUserId = match.id;
        break;
      }
      if (!list?.users?.length || list.users.length < 200) break;
      page += 1;
    }
  } else if (inviteErr) {
    return NextResponse.json(
      { error: inviteErr.message ?? "Failed to invite user." },
      { status: 502 },
    );
  }

  if (!inviteeUserId) {
    return NextResponse.json(
      {
        error:
          "Could not create or locate that user. Try a different email or contact support.",
      },
      { status: 502 },
    );
  }

  // Idempotent: if the user is already a member of this project,
  // surface a friendly conflict instead of an RLS error.
  const { data: existing } = await admin
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", inviteeUserId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "That user is already a member of this project." },
      { status: 409 },
    );
  }

  const { data: row, error: insertErr } = await admin
    .from("project_members")
    .insert({
      project_id: projectId,
      user_id: inviteeUserId,
      role,
      invited_email: email,
      invited_by: user.id,
    })
    .select("id, project_id, user_id, role, invited_email, invited_at")
    .single();
  if (insertErr) {
    return NextResponse.json(
      { error: insertErr.message ?? "Failed to add member." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    outcome, // "invited" → Supabase sent a magic-link email
    member: row,
  });
}

// GET /api/projects/[id]/members
//
// List members with their display email. We hit auth.users via the
// service role so we can show the real email rather than just the
// `invited_email` that was typed at invite time (in case it was
// re-aliased / changed since).
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // RLS already restricts which members a non-owner can see (only
  // their own row), so this works for both owner + viewer callers.
  const { data: members, error } = await supabase
    .from("project_members")
    .select("id, project_id, user_id, role, invited_email, invited_at")
    .eq("project_id", projectId)
    .order("invited_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve emails for the user_ids via the admin client. Cheap —
  // memberships are tiny.
  const admin = supabaseAdmin();
  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(
        m.user_id as string,
      );
      return {
        ...m,
        display_email:
          data?.user?.email ?? (m.invited_email as string) ?? "—",
      };
    }),
  );

  return NextResponse.json({ members: enriched });
}
