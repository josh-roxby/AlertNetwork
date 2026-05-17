import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  filterByWindow,
  mapApifyPost,
  postHandle,
  scrapeTikTokUrls,
} from "@/lib/apify/tiktok";
import { bumpAccountLastScraped, upsertPosts } from "@/lib/data/posts";
import { isCronAuthorised } from "@/lib/cron-auth";

// 5 minutes — enough for one batched Apify call covering ~100 accounts.
// Hobby plan caps at 60s; this needs Pro or a self-hosted runner.
export const maxDuration = 300;

const DEFAULT_WINDOW_HOURS = 48;
const DEFAULT_MAX_ITEMS_PER_ACCOUNT = 50;

// /api/cron/daily
//
// Triggered daily — primarily by Vercel Cron (GET — see vercel.json),
// secondarily by the GitHub Actions workflow (POST — see
// .github/workflows/cron.yml). Both auth via a shared bearer secret;
// see src/lib/cron-auth.ts.
//
// Loops every account across every project (service-role read),
// batches them into a single Apify run, then maps results back to
// accounts by handle and upserts the per-account posts.

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  if (!isCronAuthorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: accounts, error } = await admin
    .from("accounts")
    .select("id, url, handle, project_id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ totalAccounts: 0, results: [] });
  }

  // Build a handle → account.id lookup. Handles are lowercased with no
  // leading `@`, matching the convention in `accounts.ts`.
  const accountByHandle = new Map<string, { id: string }>();
  for (const a of accounts) {
    accountByHandle.set(a.handle.replace(/^@/, "").toLowerCase(), {
      id: a.id,
    });
  }

  // One Apify run covering every account URL. Cheaper + faster than
  // looping serially.
  let apifyPosts;
  try {
    apifyPosts = await scrapeTikTokUrls({
      urls: accounts.map((a) => a.url),
      maxItems: accounts.length * DEFAULT_MAX_ITEMS_PER_ACCOUNT,
      timeoutMs: 250_000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apify call failed";
    return NextResponse.json(
      { error: message, totalAccounts: accounts.length },
      { status: 502 },
    );
  }

  // Bucket the posts by account.
  const buckets = new Map<string, ReturnType<typeof mapApifyPost>[]>();
  for (const post of apifyPosts) {
    const handle = postHandle(post);
    if (!handle) continue;
    const account = accountByHandle.get(handle);
    if (!account) continue;
    const mapped = mapApifyPost(post);
    if (!mapped) continue;
    const arr = buckets.get(account.id) ?? [];
    arr.push(mapped);
    buckets.set(account.id, arr);
  }

  type Result = {
    accountId: string;
    handle: string;
    written: number;
    error?: string;
  };

  const results: Result[] = [];
  for (const account of accounts) {
    const bucket = buckets.get(account.id) ?? [];
    const within = filterByWindow(
      bucket.filter((p): p is NonNullable<typeof p> => p !== null),
      DEFAULT_WINDOW_HOURS,
    );
    try {
      const { written } = await upsertPosts(admin, account.id, within);
      await bumpAccountLastScraped(admin, account.id);
      results.push({
        accountId: account.id,
        handle: account.handle,
        written,
      });
    } catch (err) {
      results.push({
        accountId: account.id,
        handle: account.handle,
        written: 0,
        error: err instanceof Error ? err.message : "upsert failed",
      });
    }
  }

  console.info(
    `[cron/daily] accounts=${accounts.length} successful=${results.filter((r) => !r.error).length} failed=${results.filter((r) => r.error).length}`,
  );

  return NextResponse.json({
    totalAccounts: accounts.length,
    successful: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
    results,
  });
}
