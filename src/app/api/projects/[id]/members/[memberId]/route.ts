import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const maxDuration = 30;

// DELETE /api/projects/[id]/members/[memberId]
//
// Remove a viewer from a project. Owner-gated via RLS — the DELETE
// policy on project_members enforces `is_project_owner(project_id)`,
// so a viewer trying to call this will get 0 rows affected.
//
// We deliberately do NOT delete the user from auth.users — the user
// may be a viewer on other projects, or may be the owner of one. We
// only sever this project membership.
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id: projectId, memberId } = await context.params;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("project_members")
    .delete({ count: "exact" })
    .eq("id", memberId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (count === 0) {
    return NextResponse.json(
      { error: "Member not found, or you don't have permission to remove them." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
