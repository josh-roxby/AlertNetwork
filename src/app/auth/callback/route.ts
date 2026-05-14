import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Magic-link callback. Supabase redirects here with a `code` query param
// which we exchange for a session. Cookie is set via the @supabase/ssr
// adapter inside `supabaseServer()`.
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

  return NextResponse.redirect(new URL(next, request.url));
}
