import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Magic-link callback. Supabase redirects here with a `code` query param
// which we exchange for a session. Cookie is set via the @supabase/ssr
// adapter inside `supabaseServer()`.
//
// Invite-only gate: after the session is established we check whether
// the user owns any project OR appears in `project_members`. If
// neither, we sign them out immediately and bounce back to /login with
// a clear error. This stops randoms who happen to know the Supabase
// project URL from creating an account and seeing nothing — they'd
// land in an empty dashboard otherwise.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const fallback = new URL("/login", request.url);
    fallback.searchParams.set("error", error.message);
    return NextResponse.redirect(fallback);
  }

  // Confirm the user has at least one project they own or are a
  // member of. Both checks hit RLS-gated tables under the user's
  // session — no service role needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Invite-only gate. The user gets through if ANY of the following
  // returns truthy:
  //   - is_super_admin() RPC (SECURITY DEFINER — bypasses RLS so
  //     transient policy hiccups can't lock the super admin out)
  //   - they own at least one project
  //   - they appear in project_members
  //
  // Errors on any individual query are treated as "unknown" rather
  // than "no access" — a fail-open posture is the right default for
  // the bootstrap path so a stray RLS misconfig never bricks the
  // super admin out of the app. Any user with no real membership
  // will still bounce off the per-page RLS guards as soon as they
  // try to read anything.
  // Supabase's query builders are PromiseLike but don't have .catch
  // directly; wrap each in a regular Promise so transient failures
  // resolve to `{ data: null }` instead of throwing through Promise.all.
  const [superRes, ownedRes, memberRes] = await Promise.all([
    Promise.resolve(supabase.rpc("is_super_admin")).then(
      (r) => r as { data: unknown },
      () => ({ data: null }),
    ),
    Promise.resolve(
      supabase.from("projects").select("id").eq("owner_id", user.id).limit(1),
    ).then(
      (r) => r as { data: { id: string }[] | null },
      () => ({ data: null }),
    ),
    Promise.resolve(
      supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id)
        .limit(1),
    ).then(
      (r) => r as { data: { project_id: string }[] | null },
      () => ({ data: null }),
    ),
  ]);

  const isSuper = superRes.data === true;
  const ownsAny = (ownedRes.data?.length ?? 0) > 0;
  const isMember = (memberRes.data?.length ?? 0) > 0;
  const hasAccess = isSuper || ownsAny || isMember;

  if (!hasAccess) {
    // Only bounce when we positively know they have no membership —
    // an erroring query won't have set ownsAny / isMember to true
    // but it also shouldn't trigger the invite-only redirect on its
    // own. Log it for diagnosis.
    if (
      superRes.data !== null &&
      ownedRes.data !== null &&
      memberRes.data !== null
    ) {
      await supabase.auth.signOut();
      const fallback = new URL("/login", request.url);
      fallback.searchParams.set("error", "invite-only");
      return NextResponse.redirect(fallback);
    }
    console.error(
      `[auth/callback] access decision unclear for ${user.email}; letting through`,
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
