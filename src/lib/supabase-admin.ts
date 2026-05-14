import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client. Bypasses Row-Level Security entirely
// and must never reach the browser bundle — only import from server
// code (route handlers, server actions, cron endpoints).
//
// Use cases:
//   - `/api/cron/daily` reads every account across users
//   - `/api/scrape/tiktok-daily` upserts posts when called by the cron
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "supabaseAdmin: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
