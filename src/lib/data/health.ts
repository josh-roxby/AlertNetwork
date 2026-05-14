// Health scoring + band derivation. The DB stores raw posts only —
// every "health" / "trend" / "median views" number you see in the UI
// is computed client-side from a posts array. Keeping the formula in
// one place makes it easy to tune as we learn what feels right.

import type { PostRow } from "@/lib/data/types";

export type HealthBand =
  | "excellent"
  | "strong"
  | "watching"
  | "weak"
  | "critical";

export type AccountHealth = {
  postCount: number; // posts in the window
  totalViews: number;
  medianViews: number;
  totalEngagements: number; // likes + comments + shares
  engagementRate: number; // 0..1
  postsPerWeek: number;
  healthScore: number; // 0..100
  trendDelta: number; // % change in median views, this 7d vs prior 7d
  band: HealthBand;
};

const WINDOW_DAYS = 30;

export function computeAccountHealth(posts: PostRow[]): AccountHealth {
  const now = Date.now();
  const windowMs = WINDOW_DAYS * 24 * 3600 * 1000;
  const recent = posts.filter(
    (p) => now - new Date(p.posted_at).getTime() <= windowMs,
  );

  if (recent.length === 0) {
    return {
      postCount: 0,
      totalViews: 0,
      medianViews: 0,
      totalEngagements: 0,
      engagementRate: 0,
      postsPerWeek: 0,
      healthScore: 0,
      trendDelta: 0,
      band: "critical",
    };
  }

  const views = recent.map((p) => p.views).sort((a, b) => a - b);
  const totalViews = views.reduce((s, v) => s + v, 0);
  const medianViews = median(views);
  const totalEngagements = recent.reduce(
    (s, p) => s + p.likes + p.comments + p.shares,
    0,
  );
  const engagementRate = totalViews > 0 ? totalEngagements / totalViews : 0;
  const postsPerWeek = (recent.length / WINDOW_DAYS) * 7;

  // Sub-scores, each 0..100.
  // - engagement: 10% engagement maps to ~100. Most TikTok creators
  //   sit at 3-8%; over 10% is exceptional.
  const engScore = clamp(engagementRate * 1000, 0, 100);
  // - frequency: 7 posts/week (≈daily) caps at 100. Below 1/week tails
  //   off quickly.
  const freqScore = clamp((postsPerWeek / 7) * 100, 0, 100);
  // - recency: scoring posts within the last day = 100, ramping down
  //   linearly to 0 over the WINDOW_DAYS period.
  const latestPostMs = Math.max(
    ...recent.map((p) => new Date(p.posted_at).getTime()),
  );
  const ageDays = (now - latestPostMs) / (24 * 3600 * 1000);
  const recScore = clamp(100 - (ageDays / WINDOW_DAYS) * 100, 0, 100);

  const healthScore = Math.round((engScore + freqScore + recScore) / 3);

  // Trend: median views this 7d vs prior 7d. Returns 0 when there
  // isn't enough data on either side to compare cleanly.
  const trendDelta = trendDeltaPct(recent, now);

  return {
    postCount: recent.length,
    totalViews,
    medianViews,
    totalEngagements,
    engagementRate,
    postsPerWeek,
    healthScore,
    trendDelta,
    band: healthBand(healthScore),
  };
}

export function healthBand(score: number): HealthBand {
  if (score >= 80) return "excellent";
  if (score >= 65) return "strong";
  if (score >= 50) return "watching";
  if (score >= 30) return "weak";
  return "critical";
}

export const BAND_LABEL: Record<HealthBand, string> = {
  excellent: "Excellent",
  strong: "Strong",
  watching: "Watching",
  weak: "Weak",
  critical: "Critical",
};

export const BAND_TONE: Record<HealthBand, string> = {
  excellent: "text-good",
  strong: "text-ink",
  watching: "text-ink-2",
  weak: "text-accent",
  critical: "text-bad",
};

export const BAND_BG: Record<HealthBand, string> = {
  excellent: "bg-good-soft text-good",
  strong: "bg-surface-2 text-ink",
  watching: "bg-surface-3 text-ink-2",
  weak: "bg-accent-soft text-accent",
  critical: "bg-bad-soft text-bad",
};

function median(sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0;
  const mid = Math.floor(sortedAsc.length / 2);
  if (sortedAsc.length % 2 === 0) {
    return Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2);
  }
  return sortedAsc[mid];
}

function trendDeltaPct(posts: PostRow[], now: number): number {
  const day = 24 * 3600 * 1000;
  const since7d = now - 7 * day;
  const since14d = now - 14 * day;

  const this7 = posts
    .filter((p) => new Date(p.posted_at).getTime() > since7d)
    .map((p) => p.views)
    .sort((a, b) => a - b);
  const prior7 = posts
    .filter((p) => {
      const t = new Date(p.posted_at).getTime();
      return t > since14d && t <= since7d;
    })
    .map((p) => p.views)
    .sort((a, b) => a - b);

  if (prior7.length === 0 || this7.length === 0) return 0;
  const a = median(prior7);
  const b = median(this7);
  if (a === 0) return 0;
  return ((b - a) / a) * 100;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Aggregate health for a collection of accounts — used on the
// reports page to show "avg health" for the report's scope.
export function averageHealth(
  postsByAccount: Map<string, PostRow[]>,
  accountIds: string[],
): { avgHealth: number; band: HealthBand; covered: number } {
  if (accountIds.length === 0) {
    return { avgHealth: 0, band: "critical", covered: 0 };
  }
  let total = 0;
  let counted = 0;
  for (const id of accountIds) {
    const ps = postsByAccount.get(id) ?? [];
    if (ps.length === 0) continue;
    total += computeAccountHealth(ps).healthScore;
    counted += 1;
  }
  if (counted === 0) {
    return { avgHealth: 0, band: "critical", covered: 0 };
  }
  const avg = Math.round(total / counted);
  return { avgHealth: avg, band: healthBand(avg), covered: counted };
}
