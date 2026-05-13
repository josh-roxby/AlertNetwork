import { NextResponse, type NextRequest } from "next/server";

// Auth proxy stub. Intentionally a no-op so the shell and placeholder data
// can be previewed without sign-in. Flip AUTH_ENABLED to true once sessions
// and the user model exist, then wire the redirect to the real sign-in
// route. See TODO.md.

const AUTH_ENABLED = false;

const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

export function proxy(req: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isAuthed = Boolean(req.cookies.get("session"));
  if (!isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png)).*)"],
};
