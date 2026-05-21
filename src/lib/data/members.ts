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
  role: "viewer" | "manager";
  invited_email: string;
  invited_at: string;
};

export type ProjectMemberView = ProjectMemberRow & {
  // We hydrate the display email from auth.users via the
  // /api/projects/[id]/members endpoint since RLS prevents browsers
  // reading auth.users directly. Falls back to invited_email.
  display_email: string;
};

export type ProjectRoleForUser = "owner" | "manager" | "viewer" | null;

// Resolve whether the calling user appears in `super_admins`. Uses
// the `is_super_admin()` RPC (SECURITY DEFINER) rather than a direct
// table read — the RPC bypasses RLS and gives us a clean true/false
// without any policy-evaluation surface area. If the call fails for
// any reason we conservatively return false rather than throwing —
// auth callbacks must never surface a 500 to the user here.
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const supabase = supabaseBrowser();
    const { data } = await supabase.rpc("is_super_admin");
    return data === true;
  } catch {
    return false;
  }
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
  if (memberRes.data) {
    const r = memberRes.data.role as "viewer" | "manager" | undefined;
    return r === "manager" ? "manager" : "viewer";
  }
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
