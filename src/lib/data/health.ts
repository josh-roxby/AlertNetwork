// Health scoring + band derivation. The DB stores raw posts only —
// every "health" / "trend" / "median views" number you see in the UI
// is computed client-side from a posts array.
//
// The formula is the weighted average of three 0-100 subscores:
//   - engagement: engagementRate / engagementTarget * 100, clamped
//   - frequency: postsPerWeek / frequencyTarget * 100, clamped
//   - recency: 100 - (ageDays / recencyDays) * 100, clamped
//
// Weights + targets live on each project (`projects.health_config`)
// so owners can tune the scoring to their definition of "good".

import type { HealthConfig, PostRow } from "@/lib/data/types";

export type HealthBand =
  | "excellent"
  | "strong"
  | "watching"
  | "weak"
  | "critical";

export type AccountHealth = {
  postCount: number; // posts in the 30-day window
  totalViews: number;
  medianViews: number;
  totalEngagements: number; // likes + comments + shares
  engagementRate: number; // 0..1
  postsPerWeek: number;
  healthScore: number; // 0..100
  trendDelta: number; // % change in median views, this 7d vs prior 7d
  band: HealthBand;
};

const DEFAULT_WINDOW_DAYS = 30;

// Baked-in defaults used when a project doesn't have its own config
// set. The Settings UI seeds new configs from these too.
export const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  weights: { engagement: 33, frequency: 33, recency: 34 },
  targets: {
    engagementRate: 0.1, // 10% ER scores 100 on the engagement axis
    postsPerWeek: 7, // daily posting scores 100 on the frequency axis
    recencyDays: 30, // posted today = 100, 30d ago = 0
  },
};

// Coerce a possibly-partial / null health_config into a complete one.
// Tolerates legacy rows, missing keys, and partial admin edits.
export function resolveHealthConfig(
  config: HealthConfig | null | undefined,
): HealthConfig {
  if (!config) return DEFAULT_HEALTH_CONFIG;
  return {
    weights: {
      engagement:
        finiteOr(config.weights?.engagement, DEFAULT_HEALTH_CONFIG.weights.engagement),
      frequency:
        finiteOr(config.weights?.frequency, DEFAULT_HEALTH_CONFIG.weights.frequency),
      recency:
        finiteOr(config.weights?.recency, DEFAULT_HEALTH_CONFIG.weights.recency),
    },
    targets: {
      engagementRate: positiveOr(
        config.targets?.engagementRate,
        DEFAULT_HEALTH_CONFIG.targets.engagementRate,
      ),
      postsPerWeek: positiveOr(
        config.targets?.postsPerWeek,
        DEFAULT_HEALTH_CONFIG.targets.postsPerWeek,
      ),
      recencyDays: positiveOr(
        config.targets?.recencyDays,
        DEFAULT_HEALTH_CONFIG.targets.recencyDays,
      ),
    },
  };
}

export function computeAccountHealth(
  posts: PostRow[],
  config?: HealthConfig | null,
  windowDays: number = DEFAULT_WINDOW_DAYS,
): AccountHealth {
  const cfg = resolveHealthConfig(config);
  const now = Date.now();
  const windowMs = windowDays * 24 * 3600 * 1000;
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
  const postsPerWeek = (recent.length / windowDays) * 7;

  // Per-axis scoring uses the config's targets.
  const engScore = clamp(
    (engagementRate / cfg.targets.engagementRate) * 100,
    0,
    100,
  );
  const freqScore = clamp(
    (postsPerWeek / cfg.targets.postsPerWeek) * 100,
    0,
    100,
  );
  const latestPostMs = Math.max(
    ...recent.map((p) => new Date(p.posted_at).getTime()),
  );
  const ageDays = (now - latestPostMs) / (24 * 3600 * 1000);
  const recScore = clamp(
    100 - (ageDays / cfg.targets.recencyDays) * 100,
    0,
    100,
  );

  // Weighted average of the three sub-scores. Weight sum is
  // normalised on the fly so partial-fill configs still produce a
  // valid 0-100 number.
  const wSum =
    cfg.weights.engagement + cfg.weights.frequency + cfg.weights.recency;
  const safeSum = wSum > 0 ? wSum : 1;
  const healthScore = Math.round(
    (engScore * cfg.weights.engagement +
      freqScore * cfg.weights.frequency +
      recScore * cfg.weights.recency) /
      safeSum,
  );

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

function finiteOr(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : fallback;
}

function positiveOr(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : fallback;
}

// Aggregate health for a collection of accounts — used on the
// reports page to show "avg health" for the report's scope.
export function averageHealth(
  postsByAccount: Map<string, PostRow[]>,
  accountIds: string[],
  config?: HealthConfig | null,
): { avgHealth: number; band: HealthBand; covered: number } {
  if (accountIds.length === 0) {
    return { avgHealth: 0, band: "critical", covered: 0 };
  }
  let total = 0;
  let counted = 0;
  for (const id of accountIds) {
    const ps = postsByAccount.get(id) ?? [];
    if (ps.length === 0) continue;
    total += computeAccountHealth(ps, config).healthScore;
    counted += 1;
  }
  if (counted === 0) {
    return { avgHealth: 0, band: "critical", covered: 0 };
  }
  const avg = Math.round(total / counted);
  return { avgHealth: avg, band: healthBand(avg), covered: counted };
}
