import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  filterByWindow,
  mapApifyPost,
  scrapeTikTokUrl,
} from "@/lib/apify/tiktok";
import { bumpAccountLastScraped, upsertPosts } from "@/lib/data/posts";

// Sync calls to the Apify TikTok actor can take up to ~60s for a full
// user feed. Bump Vercel's serverless function limit to match.
export const maxDuration = 60;

type Body = {
  accountId?: string;
  windowHours?: number;
  maxItems?: number;
};

// POST /api/scrape/tiktok-account
//
// Two auth paths:
//   - Logged-in user (Supabase cookie session): must own the account
//     via RLS. Used by AddAccountSheet for the 7-day backfill.
//   - Cron / service callers: pass `Authorization: Bearer
//     ${CRON_SHARED_SECRET}`. Used by the daily 48h scrape (N-3).
//
// In both cases the actual posts upsert + account stamp run against
// the service-role client so RLS doesn't gate the cron path.
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.accountId) {
    return NextResponse.json(
      { error: "accountId required" },
      { status: 400 },
    );
  }

  const windowHours = body.windowHours ?? 48;
  const maxItems = body.maxItems ?? 50;

  // Auth — cron path first so it can short-circuit the session check.
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SHARED_SECRET;
  const isCron =
    !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // RLS gates the read — confirms the user owns this account.
    const { data: owned, error: ownError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", body.accountId)
      .maybeSingle();
    if (ownError || !owned) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  // From here on, service-role for the upserts.
  const admin = supabaseAdmin();
  const { data: account, error: accError } = await admin
    .from("accounts")
    .select("id, url")
    .eq("id", body.accountId)
    .single();

  if (accError || !account) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let scanned = 0;
  let written = 0;
  try {
    const apifyPosts = await scrapeTikTokUrl({
      url: account.url,
      maxItems,
    });
    scanned = apifyPosts.length;

    const mapped = apifyPosts
      .map(mapApifyPost)
      .filter((p): p is NonNullable<typeof p> => p !== null);
    const withinWindow = filterByWindow(mapped, windowHours);

    const result = await upsertPosts(admin, account.id, withinWindow);
    written = result.written;

    await bumpAccountLastScraped(admin, account.id);
  } catch (err) {
    // Even on Apify failure, the account row still exists. Surface
    // the error so the user-side fire-and-forget can log it, but
    // don't try to roll back state.
    const message = err instanceof Error ? err.message : "scrape failed";
    return NextResponse.json(
      { error: message, scanned, written },
      { status: 502 },
    );
  }

  return NextResponse.json({ scanned, written, windowHours });
}
