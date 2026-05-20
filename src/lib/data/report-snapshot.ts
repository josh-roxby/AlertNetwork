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

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeAccountHealth,
  resolveHealthConfig,
  type AccountHealth,
  type HealthBand,
} from "@/lib/data/health";
import { isoDaysAgo } from "@/lib/time";
import type { HealthConfig, PostRow } from "@/lib/data/types";

const WINDOW_DAYS = 30;

export type ReportSnapshotV1 = {
  version: 1;
  generated_at: string;
  window_days: number;
  scope: {
    kind: "project" | "category" | "account";
    account_ids: string[];
    category_ids: string[];
  };
  totals: {
    account_count: number;
    covered_accounts: number;
    post_count: number;
    total_views: number;
    total_engagements: number;
    engagement_rate: number;
    avg_health: number;
    avg_band: HealthBand;
    top_score: number;
    movers_count: number;
  };
  accounts: SnapshotAccount[];
  top_posts: SnapshotPost[];
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
    .select("id, project_id, scope_kind")
    .eq("id", reportId)
    .single();
  if (error || !report) {
    throw new Error(`report ${reportId} not found`);
  }

  const scopeKind = report.scope_kind as ReportSnapshotV1["scope"]["kind"];
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
  let posts: PostRow[] = [];
  if (accountIds.length > 0) {
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
        .gte("posted_at", isoDaysAgo(WINDOW_DAYS)),
    ]);
    accountRows = (accRes.data ?? []) as unknown as AccountWithCategory[];
    posts = (postRes.data ?? []) as PostRow[];
  }

  const postsByAccount = new Map<string, PostRow[]>();
  for (const p of posts) {
    const arr = postsByAccount.get(p.account_id);
    if (arr) arr.push(p);
    else postsByAccount.set(p.account_id, [p]);
  }

  const handleById = new Map<string, string>();
  for (const a of accountRows) handleById.set(a.id, a.handle);

  const accountsSnap: SnapshotAccount[] = accountRows.map((a) => ({
    id: a.id,
    handle: a.handle,
    url: a.url,
    display_name: a.display_name,
    category_id: a.category_id,
    category_label: a.category?.label ?? null,
    category_palette_id: a.category?.palette_id ?? null,
    health: computeAccountHealth(postsByAccount.get(a.id) ?? [], healthConfig),
  }));

  // Top 5 posts across scoped accounts by view count, denormalised
  // with the handle so the renderer doesn't need to join.
  const topPostsSnap: SnapshotPost[] = posts
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

  // Aggregate roll-ups — same math as the report view's overview.
  let totalViews = 0;
  let totalEngagements = 0;
  let postCount = 0;
  let healthSum = 0;
  let covered = 0;
  let topScore = 0;
  let movers = 0;
  for (const a of accountsSnap) {
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
    version: 1,
    generated_at: new Date().toISOString(),
    window_days: WINDOW_DAYS,
    scope: {
      kind: scopeKind,
      account_ids: accountIds,
      category_ids: categoryIds,
    },
    totals: {
      account_count: accountsSnap.length,
      covered_accounts: covered,
      post_count: postCount,
      total_views: totalViews,
      total_engagements: totalEngagements,
      engagement_rate: engagementRate,
      avg_health: avgHealth,
      avg_band: bandFromScore(avgHealth),
      top_score: topScore,
      movers_count: movers,
    },
    accounts: accountsSnap,
    top_posts: topPostsSnap,
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
