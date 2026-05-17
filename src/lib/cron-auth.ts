// Shared auth check for cron-style routes. Accepts either of:
//   - `CRON_SHARED_SECRET` — GitHub Actions workflow value
//   - `CRON_SECRET` — Vercel Cron's convention (Vercel auto-sends
//     `Authorization: Bearer ${CRON_SECRET}` when invoking the route)
// Either env var is enough so the user can run both triggers (GH
// Actions as backup + Vercel Cron as primary) without juggling
// duplicate values.

import type { NextRequest } from "next/server";

export function isCronAuthorised(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const provided = auth.slice("Bearer ".length);
  const candidates = [
    process.env.CRON_SHARED_SECRET,
    process.env.CRON_SECRET,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);
  return candidates.some((expected) => expected === provided);
}
