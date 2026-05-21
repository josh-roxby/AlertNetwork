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
import {
  detectSource,
  finishScrapeRun,
  recentSuccessfulRun,
  startScrapeRun,
} from "@/lib/data/scrape-runs";

// 5 minutes — enough for one batched Apify call covering ~100 accounts.
// Hobby plan caps at 60s; this needs Pro or a self-hosted runner.
export const maxDuration = 300;

// 7-day window: wider than strictly needed for a daily run, but covers
// us if a day is missed (Vercel cron failure, deploy gap, etc.) so the
// next successful run still backfills the gap.
const DEFAULT_WINDOW_HOURS = 168;
const DEFAULT_MAX_ITEMS_PER_ACCOUNT = 50;

// If a successful run has already landed in this many minutes, skip
// the new invocation. Lets us run pg_cron + Vercel Cron + GitHub
// Actions in parallel without paying for triplicated Apify scrapes.
const DEDUP_WINDOW_MINUTES = 60;

const ROUTE = "/api/cron/daily";

// /api/cron/daily
//
// Triggered daily — by Postgres pg_cron (POST — see
// supabase/setup-pg-cron.sql) AND optionally by Vercel Cron (GET —
// see vercel.json) AND/OR GitHub Actions. Each invocation is
// audited in `scrape_runs`. The first one to land does the work;
// subsequent triggers within the dedup window return early as
// 'skipped'.

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
  const source = detectSource(request);
  const startedAt = Date.now();

  // Dedup — skip if a successful run for this route landed in the
  // last hour. Audit the skip so we can see what triggered the
  // duplicate.
  const recent = await recentSuccessfulRun(admin, ROUTE, DEDUP_WINDOW_MINUTES);
  if (recent) {
    const runId = await startScrapeRun(admin, {
      source,
      route: ROUTE,
      notes: { skipped_because: "recent_success", recent_started_at: recent },
    });
    await finishScrapeRun(admin, runId, {
      status: "skipped",
      startedAt,
    });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "recent_success",
      recentStartedAt: recent,
    });
  }

  const runId = await startScrapeRun(admin, { source, route: ROUTE });

  const { data: accounts, error } = await admin
    .from("accounts")
    .select("id, url, handle, project_id");
  if (error) {
    await finishScrapeRun(admin, runId, {
      status: "failed",
      errorMessage: error.message,
      startedAt,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!accounts || accounts.length === 0) {
    await finishScrapeRun(admin, runId, {
      status: "success",
      accountsTotal: 0,
      startedAt,
    });
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
    await finishScrapeRun(admin, runId, {
      status: "failed",
      errorMessage: message,
      accountsTotal: accounts.length,
      startedAt,
    });
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
  let totalWritten = 0;
  for (const account of accounts) {
    const bucket = buckets.get(account.id) ?? [];
    const within = filterByWindow(
      bucket.filter((p): p is NonNullable<typeof p> => p !== null),
      DEFAULT_WINDOW_HOURS,
    );
    try {
      const { written } = await upsertPosts(admin, account.id, within);
      await bumpAccountLastScraped(admin, account.id);
      totalWritten += written;
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

  const successful = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  console.info(
    `[cron/daily] source=${source} accounts=${accounts.length} ok=${successful} failed=${failed} posts=${totalWritten}`,
  );

  await finishScrapeRun(admin, runId, {
    status:
      failed === 0
        ? "success"
        : successful === 0
          ? "failed"
          : "partial",
    accountsTotal: accounts.length,
    accountsOk: successful,
    postsWritten: totalWritten,
    apifyItems: apifyPosts.length,
    startedAt,
    notes:
      failed > 0
        ? {
            failed_accounts: results
              .filter((r) => r.error)
              .map((r) => ({ handle: r.handle, error: r.error })),
          }
        : undefined,
  });

  return NextResponse.json({
    totalAccounts: accounts.length,
    successful,
    failed,
    postsWritten: totalWritten,
    apifyItems: apifyPosts.length,
    source,
    results,
  });
}
