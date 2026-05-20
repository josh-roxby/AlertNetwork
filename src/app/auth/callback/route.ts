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

  const [ownedRes, memberRes] = await Promise.all([
    supabase.from("projects").select("id").eq("owner_id", user.id).limit(1),
    supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id)
      .limit(1),
  ]);

  const hasAccess =
    (ownedRes.data?.length ?? 0) > 0 || (memberRes.data?.length ?? 0) > 0;

  if (!hasAccess) {
    await supabase.auth.signOut();
    const fallback = new URL("/login", request.url);
    fallback.searchParams.set("error", "invite-only");
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
