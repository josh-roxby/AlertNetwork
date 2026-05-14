import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Server-component / route-handler Supabase client. Reads + writes the
// session cookies so RLS sees the signed-in user. Returns a fresh
// client per request — do not cache it across requests.
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          // Server Components can't write cookies — silently ignore so the
          // shared client can be used in both contexts. Cookie writes that
          // matter (e.g. sign-in callbacks) happen in route handlers /
          // server actions where this call succeeds.
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // no-op
          }
        },
      },
    },
  );
}
