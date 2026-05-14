// PLACEHOLDER DATA — REMOVE WHEN DATABASE IS WIRED UP.
//
// Everything in this file is mock data used to build and preview the UI before
// the backend exists. Toggle PLACEHOLDER_MODE off (or delete this file and its
// imports) once Postgres + Apify ingestion are in place. See TODO.md.

export const PLACEHOLDER_MODE = true;

export type Category =
  | "fashion"
  | "food"
  | "beauty"
  | "tech"
  | "sports"
  | "music"
  | "travel"
  | "lifestyle";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "fashion", label: "Fashion" },
  { id: "food", label: "Food" },
  { id: "beauty", label: "Beauty" },
  { id: "tech", label: "Tech" },
  { id: "sports", label: "Sports" },
  { id: "music", label: "Music" },
  { id: "travel", label: "Travel" },
  { id: "lifestyle", label: "Lifestyle" },
];

export type Account = {
  id: string;
  handle: string;
  displayName: string;
  platform: "tiktok";
  url: string;
  category: Category;
  followers: number;
  medianViews: number;
  totalViews: number;
  engagementRatio: number;
  postsPerCycle: number;
  healthScore: number;
  trendDelta: number;
  tags: string[];
  lastLoggedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  accountCount: number;
  ownerEmail: string;
  updatedAt: string;
};

export type Report = {
  id: string;
  name: string;
  description: string;
  scope: string;
  scopeKind: "project" | "tag" | "account";
  cadence: "weekly" | "monthly";
  schedule: string;
  recipients: number;
  recipientEmails: string[];
  status: "live" | "paused" | "draft";
  isFeatured: boolean;
  password: string | null;
  lastSentAt: string | null;
  accountIds: string[];
  history: ReportHistoryEntry[];
};

export type ReportHistoryEntry = {
  id: string;
  sentAt: string;
  status: "delivered" | "failed";
  recipients: number;
  accounts: number;
};

export const placeholderAccounts: Account[] = [
  {
    id: "acc_01",
    handle: "@northlight",
    displayName: "Northlight",
    platform: "tiktok",
    url: "https://www.tiktok.com/@northlight",
    category: "music",
    followers: 184_000,
    medianViews: 42_500,
    totalViews: 2_120_000,
    engagementRatio: 0.071,
    postsPerCycle: 1.2,
    healthScore: 82,
    trendDelta: 6.4,
    tags: ["indie", "uk"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
  {
    id: "acc_02",
    handle: "@sundaykitchen",
    displayName: "Sunday Kitchen",
    platform: "tiktok",
    url: "https://www.tiktok.com/@sundaykitchen",
    category: "food",
    followers: 612_000,
    medianViews: 128_000,
    totalViews: 18_800_000,
    engagementRatio: 0.054,
    postsPerCycle: 0.8,
    healthScore: 74,
    trendDelta: -2.1,
    tags: ["recipes"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
  {
    id: "acc_03",
    handle: "@parkrunpete",
    displayName: "Parkrun Pete",
    platform: "tiktok",
    url: "https://www.tiktok.com/@parkrunpete",
    category: "sports",
    followers: 39_500,
    medianViews: 11_200,
    totalViews: 420_000,
    engagementRatio: 0.092,
    postsPerCycle: 3.4,
    healthScore: 68,
    trendDelta: 18.7,
    tags: ["running", "micro"],
    lastLoggedAt: "2026-05-10T08:00:00Z",
  },
  {
    id: "acc_04",
    handle: "@cassette.daily",
    displayName: "Cassette Daily",
    platform: "tiktok",
    url: "https://www.tiktok.com/@cassette.daily",
    category: "music",
    followers: 92_300,
    medianViews: 18_800,
    totalViews: 1_540_000,
    engagementRatio: 0.041,
    postsPerCycle: 0.9,
    healthScore: 51,
    trendDelta: -8.3,
    tags: ["archive"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
  {
    id: "acc_05",
    handle: "@studio.exhale",
    displayName: "Studio Exhale",
    platform: "tiktok",
    url: "https://www.tiktok.com/@studio.exhale",
    category: "music",
    followers: 1_240_000,
    medianViews: 305_000,
    totalViews: 86_400_000,
    engagementRatio: 0.038,
    postsPerCycle: 0.6,
    healthScore: 79,
    trendDelta: 1.2,
    tags: ["partner"],
    lastLoggedAt: "2026-05-10T08:00:00Z",
  },
  {
    id: "acc_06",
    handle: "@quietmornings",
    displayName: "Quiet Mornings",
    platform: "tiktok",
    url: "https://www.tiktok.com/@quietmornings",
    category: "lifestyle",
    followers: 22_100,
    medianViews: 6_400,
    totalViews: 220_000,
    engagementRatio: 0.118,
    postsPerCycle: 2.1,
    healthScore: 64,
    trendDelta: 22.4,
    tags: ["micro"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
  {
    id: "acc_07",
    handle: "@blueprintbeauty",
    displayName: "Blueprint Beauty",
    platform: "tiktok",
    url: "https://www.tiktok.com/@blueprintbeauty",
    category: "beauty",
    followers: 268_000,
    medianViews: 51_300,
    totalViews: 5_640_000,
    engagementRatio: 0.063,
    postsPerCycle: 1.1,
    healthScore: 88,
    trendDelta: 4.6,
    tags: ["partner", "skincare"],
    lastLoggedAt: "2026-05-10T08:00:00Z",
  },
  {
    id: "acc_08",
    handle: "@wirefive",
    displayName: "Wire Five",
    platform: "tiktok",
    url: "https://www.tiktok.com/@wirefive",
    category: "tech",
    followers: 73_400,
    medianViews: 15_600,
    totalViews: 740_000,
    engagementRatio: 0.048,
    postsPerCycle: 1.4,
    healthScore: 35,
    trendDelta: -14.2,
    tags: ["reviews"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
];

export const placeholderProjects: Project[] = [
  {
    id: "prj_01",
    name: "Spring Music Sponsorships",
    description: "UK-focused indie music creators, 50–200k follower band.",
    accountCount: 42,
    ownerEmail: "josh@exhalestudios.co",
    updatedAt: "2026-05-12T07:55:00Z",
  },
  {
    id: "prj_02",
    name: "Lifestyle Pilot",
    description: "Lifestyle micro-creators under 100k for an open brief.",
    accountCount: 18,
    ownerEmail: "josh@exhalestudios.co",
    updatedAt: "2026-05-11T16:20:00Z",
  },
  {
    id: "prj_03",
    name: "Client X Watchlist",
    description: "Existing partner accounts for the monthly client report.",
    accountCount: 11,
    ownerEmail: "josh@exhalestudios.co",
    updatedAt: "2026-05-09T10:02:00Z",
  },
];

export const placeholderReports: Report[] = [
  {
    id: "rep_01",
    name: "Client X — Monthly partner roundup",
    description:
      "Top 25 partner accounts for the Client X retainer. Sent on the 1st of each month.",
    scope: "Project · Client X Watchlist",
    scopeKind: "project",
    cadence: "monthly",
    schedule: "1st of month · 08:00 GMT",
    recipients: 3,
    recipientEmails: [
      "campaigns@clientx.com",
      "lead@clientx.com",
      "josh@exhalestudios.co",
    ],
    status: "live",
    isFeatured: true,
    password: "clientx",
    lastSentAt: "2026-05-01T08:05:00Z",
    accountIds: ["acc_05", "acc_07", "acc_02", "acc_01", "acc_03"],
    history: [
      {
        id: "h_01",
        sentAt: "2026-05-01T08:05:00Z",
        status: "delivered",
        recipients: 3,
        accounts: 25,
      },
      {
        id: "h_02",
        sentAt: "2026-04-01T08:04:00Z",
        status: "delivered",
        recipients: 3,
        accounts: 24,
      },
      {
        id: "h_03",
        sentAt: "2026-03-01T08:07:00Z",
        status: "delivered",
        recipients: 3,
        accounts: 22,
      },
      {
        id: "h_04",
        sentAt: "2026-02-01T08:06:00Z",
        status: "failed",
        recipients: 3,
        accounts: 21,
      },
    ],
  },
  {
    id: "rep_02",
    name: "Indie music weekly",
    description: "Every UK indie music account in the project, ranked by health.",
    scope: "Tag · music",
    scopeKind: "tag",
    cadence: "weekly",
    schedule: "Mon · 09:00 GMT",
    recipients: 5,
    recipientEmails: [
      "josh@exhalestudios.co",
      "lab@exhalestudios.co",
      "alice@exhalestudios.co",
      "kit@exhalestudios.co",
      "campaigns@exhalestudios.co",
    ],
    status: "live",
    isFeatured: true,
    password: null,
    lastSentAt: "2026-05-12T08:10:00Z",
    accountIds: ["acc_01", "acc_05", "acc_04"],
    history: [
      {
        id: "h_05",
        sentAt: "2026-05-12T08:10:00Z",
        status: "delivered",
        recipients: 5,
        accounts: 12,
      },
      {
        id: "h_06",
        sentAt: "2026-05-05T08:09:00Z",
        status: "delivered",
        recipients: 5,
        accounts: 12,
      },
      {
        id: "h_07",
        sentAt: "2026-04-28T08:08:00Z",
        status: "delivered",
        recipients: 4,
        accounts: 11,
      },
    ],
  },
  {
    id: "rep_03",
    name: "Quiet Mornings spike check",
    description:
      "Weekly momentum check on @quietmornings — paused after the initial spike investigation.",
    scope: "Account · @quietmornings",
    scopeKind: "account",
    cadence: "weekly",
    schedule: "Tue · 09:00 GMT",
    recipients: 1,
    recipientEmails: ["josh@exhalestudios.co"],
    status: "paused",
    isFeatured: false,
    password: null,
    lastSentAt: null,
    accountIds: ["acc_06"],
    history: [],
  },
];

// Adapter: turns a placeholder Account into the AccountView shape the
// account-row / detail components expect post M-3b.1. Used by the
// still-placeholder reports pages until M-3b.2 wires them to real data.
import type { AccountView } from "@/lib/data/types";

export function adaptPlaceholderToView(a: Account): AccountView {
  return {
    id: a.id,
    project_id: "",
    handle: a.handle,
    display_name: a.displayName,
    platform: a.platform,
    url: a.url,
    category_id: a.category,
    followers: a.followers,
    last_logged_at: a.lastLoggedAt,
    last_scraped_at: a.lastLoggedAt,
    created_at: a.lastLoggedAt,
    updated_at: a.lastLoggedAt,
    category: {
      id: a.category,
      project_id: "",
      label: a.category.charAt(0).toUpperCase() + a.category.slice(1),
      palette_id: a.category,
      created_at: a.lastLoggedAt,
    },
    tagLabels: a.tags,
  };
}

export function findReport(id: string) {
  return placeholderReports.find((r) => r.id === id) ?? null;
}

export function findAccount(id: string) {
  return placeholderAccounts.find((a) => a.id === id) ?? null;
}

export function accountsForReport(report: Report) {
  return report.accountIds
    .map((id) => placeholderAccounts.find((a) => a.id === id))
    .filter((a): a is Account => Boolean(a));
}

// Deterministic seeded PRNG so chart data is stable across renders.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type AccountSeriesPoint = {
  date: string; // ISO date (UTC midnight) for the day
  views: number;
  medianViews: number;
  engagement: number; // 0..1
  followers: number;
  health: number; // 0..100
};

/**
 * Returns one data point per day for the past `days` days, ending today.
 * Deterministic per account (seeded by account id) so the same chart shape
 * renders on every visit.
 */
export function accountTimeSeries(
  account: Account,
  days = 90,
  now: Date = new Date(),
): AccountSeriesPoint[] {
  const rng = mulberry32(seedFromString(account.id));
  const points: AccountSeriesPoint[] = [];

  // Long-run drift target so values approach the current ones as date → now.
  const target = {
    views: account.medianViews,
    medianViews: account.medianViews,
    engagement: account.engagementRatio,
    followers: account.followers,
    health: account.healthScore,
  };

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);

    // 0 at start, 1 at end of window — controls drift toward target.
    const t = 1 - i / (days - 1);
    // Smooth seasonal wobble + per-day noise.
    const wave = Math.sin((i / days) * Math.PI * 4) * 0.06;
    const noise = (rng() - 0.5) * 0.18;

    // Views fluctuate more than followers or engagement.
    const viewSwing = 1 + wave * 2 + noise;
    const medianSwing = 1 + wave + noise * 0.6;
    const erSwing = 1 + wave * 0.5 + noise * 0.4;
    const followerStart = target.followers * 0.85;
    const healthSwing = wave * 12 + noise * 18;

    const followers = Math.round(
      followerStart + (target.followers - followerStart) * t,
    );

    points.push({
      date: d.toISOString().slice(0, 10),
      views: Math.max(
        0,
        Math.round(target.views * 0.6 + target.views * 0.6 * viewSwing),
      ),
      medianViews: Math.max(
        0,
        Math.round(target.medianViews * 0.8 + target.medianViews * 0.4 * medianSwing),
      ),
      engagement: Math.max(
        0.005,
        target.engagement * (0.85 + 0.3 * erSwing),
      ),
      followers,
      health: Math.max(
        0,
        Math.min(100, Math.round(target.health + healthSwing * (1 - t * 0.5))),
      ),
    });
  }

  return points;
}
