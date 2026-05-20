// Frozen snapshot of a report at send time.
//
// `buildReportSnapshot` runs server-side with the service-role client
// (cron path + manual run-now). It does everything the view page
// would do at render time (resolve scope → fetch accounts + posts →
// compute health) and returns a JSON payload that's stored on the
// `report_history` row.
//
// The view page reads `report_history.payload` when a `?historyId=`
// is on the URL — meaning history rows produced after this migration
// render exactly the numbers that were live at the moment of the
// send, even if posts have been re-scraped since. Legacy history
// rows without a payload fall back to live data.
//
// Schema stays at `version: 1`. New fields (`cadence`,
// `prior_period_totals`, per-account `last_posted_at` + `mean_views`,
// per-post `likes_etc`) are all optional — old payloads render with
// missing values gracefully.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeAccountHealth,
  resolveHealthConfig,
  type AccountHealth,
  type HealthBand,
} from "@/lib/data/health";
import { dailySeries, type DailyPoint } from "@/lib/data/posts";
import type { HealthConfig, PostRow } from "@/lib/data/types";

export type ReportCadence = "weekly" | "monthly";

// Cadence drives the analysis window: weekly reports cover 7 days
// and surface w/w deltas; monthly reports cover 30 days and surface
// m/m deltas. Always backed by `report.cadence` — the live view-page
// also reads the same mapping to stay in sync with stored snapshots.
const WINDOW_DAYS_BY_CADENCE: Record<ReportCadence, number> = {
  weekly: 7,
  monthly: 30,
};

export function windowDaysFor(cadence: ReportCadence): number {
  return WINDOW_DAYS_BY_CADENCE[cadence];
}

export type ReportSnapshotV1 = {
  version: 1;
  generated_at: string;
  window_days: number;
  cadence?: ReportCadence;
  scope: {
    kind: "project" | "category" | "account";
    account_ids: string[];
    category_ids: string[];
  };
  totals: SnapshotTotals;
  // Same shape as `totals` but for the period immediately preceding
  // the current window (e.g. for a weekly report sent today, the 7
  // days before that). Powers the w/w deltas. Present from snapshots
  // built after this commit; null on older rows.
  prior_period_totals?: SnapshotTotals | null;
  accounts: SnapshotAccount[];
  top_posts: SnapshotPost[];
  // Per-day aggregate across every scoped account in the current
  // window — zero-filled. Populated from `dailySeries(currentPosts,
  // window_days)` at snapshot time so the shared/printable view can
  // draw the trend charts without re-fetching posts. Optional for
  // backward compatibility with pre-PR-47 payloads.
  daily_series?: DailyPoint[];
};

export type SnapshotTotals = {
  account_count: number;
  covered_accounts: number;
  post_count: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  total_engagements: number;
  engagement_rate: number;
  avg_health: number;
  avg_band: HealthBand;
  top_score: number;
  movers_count: number;
};

export type SnapshotAccount = {
  id: string;
  handle: string;
  url: string;
  display_name: string | null;
  category_id: string | null;
  category_label: string | null;
  category_palette_id: string | null;
  health: AccountHealth;
  // Mean is derivable (totalViews/postCount) but storing it keeps the
  // email + view-page render code clean and aligned with the screenshot.
  mean_views?: number;
  last_posted_at?: string | null;
};

export type SnapshotPost = {
  id: string;
  account_id: string;
  handle: string;
  posted_at: string;
  url: string | null;
  caption: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

export async function buildReportSnapshot(
  admin: SupabaseClient,
  reportId: string,
): Promise<ReportSnapshotV1> {
  const { data: report, error } = await admin
    .from("reports")
    .select("id, project_id, scope_kind, cadence")
    .eq("id", reportId)
    .single();
  if (error || !report) {
    throw new Error(`report ${reportId} not found`);
  }

  const scopeKind = report.scope_kind as ReportSnapshotV1["scope"]["kind"];
  const cadence = (report.cadence as ReportCadence) ?? "monthly";
  const windowDays = windowDaysFor(cadence);

  const { accountIds, categoryIds } = await resolveScope(
    admin,
    reportId,
    report.project_id as string,
    scopeKind,
  );

  const { data: projectRow } = await admin
    .from("projects")
    .select("health_config")
    .eq("id", report.project_id)
    .maybeSingle();
  const healthConfig: HealthConfig = resolveHealthConfig(
    (projectRow?.health_config as HealthConfig | null) ?? null,
  );

  let accountRows: AccountWithCategory[] = [];
  // Fetch posts covering 2x the window so both current + prior
  // period roll-ups can share one query. We split client-side.
  let posts: PostRow[] = [];
  if (accountIds.length > 0) {
    const cutoffMs = Date.now() - 2 * windowDays * 24 * 3600 * 1000;
    const [accRes, postRes] = await Promise.all([
      admin
        .from("accounts")
        .select(
          "id, handle, url, display_name, category_id, category:categories(id, label, palette_id)",
        )
        .in("id", accountIds),
      admin
        .from("posts")
        .select(
          "id, account_id, platform_post_id, posted_at, url, caption, views, likes, comments, shares, saves, first_seen_at, last_scraped_at, updated_at",
        )
        .in("account_id", accountIds)
        .gte("posted_at", new Date(cutoffMs).toISOString()),
    ]);
    accountRows = (accRes.data ?? []) as unknown as AccountWithCategory[];
    posts = (postRes.data ?? []) as PostRow[];
  }

  const now = Date.now();
  const windowMs = windowDays * 24 * 3600 * 1000;
  const currentStart = now - windowMs;
  const priorStart = now - 2 * windowMs;

  // Bucket the full window of posts by account, then split into
  // current vs prior for the roll-ups.
  const postsByAccountAll = new Map<string, PostRow[]>();
  for (const p of posts) {
    const arr = postsByAccountAll.get(p.account_id);
    if (arr) arr.push(p);
    else postsByAccountAll.set(p.account_id, [p]);
  }
  const postsByAccountCurrent = new Map<string, PostRow[]>();
  const postsByAccountPrior = new Map<string, PostRow[]>();
  for (const [acc, ps] of postsByAccountAll) {
    const cur: PostRow[] = [];
    const pri: PostRow[] = [];
    for (const p of ps) {
      const t = new Date(p.posted_at).getTime();
      if (t >= currentStart) cur.push(p);
      else if (t >= priorStart) pri.push(p);
    }
    if (cur.length) postsByAccountCurrent.set(acc, cur);
    if (pri.length) postsByAccountPrior.set(acc, pri);
  }

  const handleById = new Map<string, string>();
  for (const a of accountRows) handleById.set(a.id, a.handle);

  const accountsSnap: SnapshotAccount[] = accountRows.map((a) => {
    const accountPosts = postsByAccountCurrent.get(a.id) ?? [];
    const health = computeAccountHealth(accountPosts, healthConfig, windowDays);
    const meanViews =
      health.postCount > 0 ? Math.round(health.totalViews / health.postCount) : 0;
    let lastPostedAt: string | null = null;
    for (const p of accountPosts) {
      if (!lastPostedAt || p.posted_at > lastPostedAt) lastPostedAt = p.posted_at;
    }
    return {
      id: a.id,
      handle: a.handle,
      url: a.url,
      display_name: a.display_name,
      category_id: a.category_id,
      category_label: a.category?.label ?? null,
      category_palette_id: a.category?.palette_id ?? null,
      health,
      mean_views: meanViews,
      last_posted_at: lastPostedAt,
    };
  });

  // Top 5 posts from the CURRENT window only (snapshot's reporting
  // period), denormalised with the handle so the renderer doesn't
  // need to join.
  const currentPosts: PostRow[] = [];
  for (const ps of postsByAccountCurrent.values()) {
    for (const p of ps) currentPosts.push(p);
  }
  const topPostsSnap: SnapshotPost[] = currentPosts
    .slice()
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      account_id: p.account_id,
      handle: handleById.get(p.account_id) ?? "",
      posted_at: p.posted_at,
      url: p.url,
      caption: p.caption,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
    }));

  const totals = rollUp(accountsSnap.length, accountsSnap, currentPosts);

  // Build the same roll-up structure for the prior period using
  // account health re-computed on the prior bucket. We don't surface
  // per-account prior detail — just the aggregate.
  const priorPosts: PostRow[] = [];
  for (const ps of postsByAccountPrior.values()) {
    for (const p of ps) priorPosts.push(p);
  }
  const priorAccountSnaps: SnapshotAccount[] = accountRows.map((a) => {
    const accountPosts = postsByAccountPrior.get(a.id) ?? [];
    const health = computeAccountHealth(accountPosts, healthConfig, windowDays);
    return {
      ...emptyPriorAccountShape(a),
      health,
    };
  });
  const prior = rollUp(accountRows.length, priorAccountSnaps, priorPosts);

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    window_days: windowDays,
    cadence,
    scope: {
      kind: scopeKind,
      account_ids: accountIds,
      category_ids: categoryIds,
    },
    totals,
    prior_period_totals: prior,
    accounts: accountsSnap,
    top_posts: topPostsSnap,
    daily_series: dailySeries(currentPosts, windowDays),
  };
}

function rollUp(
  accountCount: number,
  accounts: SnapshotAccount[],
  posts: PostRow[],
): SnapshotTotals {
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalSaves = 0;
  for (const p of posts) {
    totalLikes += p.likes;
    totalComments += p.comments;
    totalShares += p.shares;
    totalSaves += p.saves;
  }

  let totalViews = 0;
  let totalEngagements = 0;
  let postCount = 0;
  let healthSum = 0;
  let covered = 0;
  let topScore = 0;
  let movers = 0;
  for (const a of accounts) {
    totalViews += a.health.totalViews;
    totalEngagements += a.health.totalEngagements;
    postCount += a.health.postCount;
    if (a.health.postCount > 0) {
      healthSum += a.health.healthScore;
      covered += 1;
      if (a.health.healthScore > topScore) topScore = a.health.healthScore;
      if (Math.abs(a.health.trendDelta) >= 8) movers += 1;
    }
  }
  const avgHealth = covered > 0 ? Math.round(healthSum / covered) : 0;
  const engagementRate = totalViews > 0 ? totalEngagements / totalViews : 0;
  return {
    account_count: accountCount,
    covered_accounts: covered,
    post_count: postCount,
    total_views: totalViews,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: totalShares,
    total_saves: totalSaves,
    total_engagements: totalEngagements,
    engagement_rate: engagementRate,
    avg_health: avgHealth,
    avg_band: bandFromScore(avgHealth),
    top_score: topScore,
    movers_count: movers,
  };
}

// Placeholder SnapshotAccount used for prior-period roll-up only —
// we never surface this in the rendered snapshot, just the aggregate.
function emptyPriorAccountShape(a: AccountWithCategory): SnapshotAccount {
  return {
    id: a.id,
    handle: a.handle,
    url: a.url,
    display_name: a.display_name,
    category_id: a.category_id,
    category_label: a.category?.label ?? null,
    category_palette_id: a.category?.palette_id ?? null,
    health: {
      postCount: 0,
      totalViews: 0,
      medianViews: 0,
      totalEngagements: 0,
      engagementRate: 0,
      postsPerWeek: 0,
      healthScore: 0,
      trendDelta: 0,
      band: "critical",
    },
  };
}

type AccountWithCategory = {
  id: string;
  handle: string;
  url: string;
  display_name: string | null;
  category_id: string | null;
  category: {
    id: string;
    label: string;
    palette_id: string | null;
  } | null;
};

async function resolveScope(
  admin: SupabaseClient,
  reportId: string,
  projectId: string,
  scopeKind: ReportSnapshotV1["scope"]["kind"],
): Promise<{ accountIds: string[]; categoryIds: string[] }> {
  if (scopeKind === "project") {
    const { data } = await admin
      .from("accounts")
      .select("id")
      .eq("project_id", projectId);
    return {
      accountIds: (data ?? []).map((row) => row.id as string),
      categoryIds: [],
    };
  }
  if (scopeKind === "account") {
    const { data } = await admin
      .from("report_accounts")
      .select("account_id")
      .eq("report_id", reportId);
    return {
      accountIds: (data ?? []).map((row) => row.account_id as string),
      categoryIds: [],
    };
  }
  if (scopeKind === "category") {
    const { data: rc } = await admin
      .from("report_categories")
      .select("category_id")
      .eq("report_id", reportId);
    const categoryIds = (rc ?? []).map((row) => row.category_id as string);
    if (categoryIds.length === 0) {
      return { accountIds: [], categoryIds: [] };
    }
    const { data } = await admin
      .from("accounts")
      .select("id")
      .eq("project_id", projectId)
      .in("category_id", categoryIds);
    return {
      accountIds: (data ?? []).map((row) => row.id as string),
      categoryIds,
    };
  }
  return { accountIds: [], categoryIds: [] };
}

function bandFromScore(score: number): HealthBand {
  if (score >= 80) return "excellent";
  if (score >= 65) return "strong";
  if (score >= 50) return "watching";
  if (score >= 30) return "weak";
  return "critical";
}

// Compute aggregate likes/comments/shares/bookmarks for a given
// posts array. Used by the email template to render the per-channel
// totals table (the version on the snapshot only carries the
// engagement-sum the health score needs).
export function aggregateMetricsFromPosts(posts: SnapshotPost[]): {
  views: number;
  likes: number;
  comments: number;
  shares: number;
} {
  let views = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  for (const p of posts) {
    views += p.views;
    likes += p.likes;
    comments += p.comments;
    shares += p.shares;
  }
  return { views, likes, comments, shares };
}
