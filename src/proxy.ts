import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Auth proxy. Refreshes the Supabase session cookie on every request
// (required by @supabase/ssr) and redirects unauthenticated traffic to
// /login. Public routes — /login itself, the /auth/* callbacks, the
// shareable /reports/<id>/view, and API routes (which authenticate
// themselves) — pass through.
//
// `proxy` is Next 16's name for what used to be `middleware`. The file
// was renamed when we moved to Next 16; see the original move's commit
// for the deprecation note.

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Dev safety: when Supabase env vars are missing (fresh clone, CI,
  // preview deploys without secrets) the proxy passes through. Real
  // environments have the keys and auth gating kicks in below.
  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && needsAuth(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

const VIEW_ONLY = /^\/reports\/[^/]+\/view(\/|$)/;

function needsAuth(pathname: string): boolean {
  if (pathname === "/login") return false;
  if (pathname.startsWith("/auth/")) return false;
  // API route handlers authenticate themselves (session cookie for
  // user-facing routes, shared secret for cron). The proxy doesn't
  // gate them so cron pings can succeed without a Supabase session.
  if (pathname.startsWith("/api/")) return false;
  if (VIEW_ONLY.test(pathname)) return false;
  return true;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png)).*)"],
};
