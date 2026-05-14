import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// POST /auth/sign-out — clears the session cookie and bounces to /login.
// Wired to a tiny <form action="/auth/sign-out" method="POST"> button
// in the desktop sidebar footer + mobile drawer footer.
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
