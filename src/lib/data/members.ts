// Project members + current-user role helpers.
//
// Split between browser-side reads (RLS-gated via the anon client) and
// server-side writes (invites + removals via the admin client behind
// API routes). The owner is NOT in `project_members` — it lives on
// `projects.owner_id` and is unioned in by `roleForProject()`.

import { supabaseBrowser } from "@/lib/supabase";

export type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: "viewer";
  invited_email: string;
  invited_at: string;
};

export type ProjectMemberView = ProjectMemberRow & {
  // We hydrate the display email from auth.users via the
  // /api/projects/[id]/members endpoint since RLS prevents browsers
  // reading auth.users directly. Falls back to invited_email.
  display_email: string;
};

export type ProjectRoleForUser = "owner" | "viewer" | null;

// Resolve whether the calling user appears in `super_admins`. Hits a
// single RLS-gated row (you can only see your own membership), so it
// returns false for anyone not on the list. Used by ShellContext to
// gate the "New project" UI.
export async function isSuperAdmin(): Promise<boolean> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}

// Resolve the calling user's role on a project. Hits two indices —
// `projects.owner_id` and `project_members.user_id` — under RLS, so
// the user can never see a project they don't belong to.
export async function roleForProject(
  projectId: string,
): Promise<ProjectRoleForUser> {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [ownerRes, memberRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (ownerRes.data) return "owner";
  if (memberRes.data) return (memberRes.data.role as "viewer") ?? "viewer";
  return null;
}

// List the viewer rows for a project. The owner row is *not* included
// here — surface it separately in the UI (we already know who the
// owner is from `projects.owner_id`).
export async function listProjectMembers(
  projectId: string,
): Promise<ProjectMemberRow[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("invited_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectMemberRow[];
}
