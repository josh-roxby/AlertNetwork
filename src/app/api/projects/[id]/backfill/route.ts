import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  filterByWindow,
  mapApifyPost,
  postHandle,
  scrapeTikTokUrls,
} from "@/lib/apify/tiktok";
import { bumpAccountLastScraped, upsertPosts } from "@/lib/data/posts";
import { finishScrapeRun, startScrapeRun } from "@/lib/data/scrape-runs";

export const maxDuration = 300;

const ROUTE = "/api/projects/[id]/backfill";

// Cap manual backfill ranges so a stray slider value can't ask
// Apify for 5 years of posts. 12 months is the sane upper bound
// the UI surfaces; we enforce it again here.
const MIN_MONTHS = 1;
const MAX_MONTHS = 12;

// Per-account item cap. Even at 12 months ~30 posts/month gives
// ~360; cap a touch higher so we cover unusually prolific
// accounts but still bound Apify cost.
const MAX_ITEMS_PER_ACCOUNT = 500;

// POST /api/projects/[id]/backfill
//
// Super-admin + project-owner gated. Re-runs the same Apify scrape
// the daily cron uses, but with a wider window (`months` × 30 days)
// — meant for one-off catch-up runs after onboarding, an Apify
// outage, or whenever the rolling daily window misses something.
//
// Posts are upserted on `(account_id, platform_post_id)` so existing
// rows get their metrics refreshed and brand-new rows are inserted.
// Audited in `scrape_runs` with source = 'manual' and notes carrying
// the months / project id.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;

  let body: { months?: number } = {};
  try {
    body = (await request.json()) as { months?: number };
  } catch {
    // empty body → use default
  }
  const monthsRaw = Number(body.months ?? 3);
  const months = Math.min(
    MAX_MONTHS,
    Math.max(MIN_MONTHS, Math.floor(monthsRaw) || 3),
  );

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Auth: super-admin AND project owner. Both are enforced server-
  // side because the scrape uses the service-role client downstream.
  const { data: superCheck } = await supabase.rpc("is_super_admin");
  if (superCheck !== true) {
    return NextResponse.json(
      { error: "Backfill is super-admin only." },
      { status: 403 },
    );
  }
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }
  if (project.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the project owner can backfill." },
      { status: 403 },
    );
  }

  const admin = supabaseAdmin();
  const startedAtMs = Date.now();
  const runId = await startScrapeRun(admin, {
    source: "manual",
    route: ROUTE,
    notes: { kind: "backfill", projectId, months },
  });

  const { data: accounts, error: accErr } = await admin
    .from("accounts")
    .select("id, url, handle, project_id")
    .eq("project_id", projectId);
  if (accErr) {
    await finishScrapeRun(admin, runId, {
      status: "failed",
      errorMessage: accErr.message,
      startedAt: startedAtMs,
    });
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }
  if (!accounts || accounts.length === 0) {
    await finishScrapeRun(admin, runId, {
      status: "success",
      accountsTotal: 0,
      startedAt: startedAtMs,
    });
    return NextResponse.json({
      ok: true,
      months,
      projectId,
      totalAccounts: 0,
      message: "Project has no accounts.",
    });
  }

  const accountByHandle = new Map<string, { id: string }>();
  for (const a of accounts) {
    accountByHandle.set(a.handle.replace(/^@/, "").toLowerCase(), {
      id: a.id,
    });
  }

  let apifyPosts;
  try {
    apifyPosts = await scrapeTikTokUrls({
      urls: accounts.map((a) => a.url),
      // Per-account ceiling × account count. Apify spreads the
      // maxItems budget across the URLs in the run.
      maxItems: accounts.length * MAX_ITEMS_PER_ACCOUNT,
      timeoutMs: 290_000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apify call failed";
    await finishScrapeRun(admin, runId, {
      status: "failed",
      accountsTotal: accounts.length,
      errorMessage: message,
      startedAt: startedAtMs,
    });
    return NextResponse.json(
      { error: message, totalAccounts: accounts.length },
      { status: 502 },
    );
  }

  // Bucket posts by account using the same handle-matching logic
  // the daily cron uses.
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

  // Months → hours for filterByWindow.
  const windowHours = months * 30 * 24;

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
      windowHours,
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
    startedAt: startedAtMs,
    notes: { kind: "backfill", months, projectId },
  });

  return NextResponse.json({
    ok: true,
    months,
    projectId,
    totalAccounts: accounts.length,
    successful,
    failed,
    postsWritten: totalWritten,
    apifyItems: apifyPosts.length,
    durationMs: Date.now() - startedAtMs,
    results,
  });
}
