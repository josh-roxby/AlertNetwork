// PLACEHOLDER DATA — REMOVE WHEN DATABASE IS WIRED UP.
//
// Everything in this file is mock data used to build and preview the UI before
// the backend exists. Toggle PLACEHOLDER_MODE off (or delete this file and its
// imports) once Postgres + Apify ingestion are in place. See TODO.md.

export const PLACEHOLDER_MODE = true;

export type Tier = "daily" | "weekly" | "hourly";

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
  tier: Tier;
  category: Category;
  followers: number;
  medianViews: number;
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
  cadence: "one-off" | "weekly" | "monthly";
  schedule: string;
  recipients: number;
  recipientEmails: string[];
  status: "live" | "paused" | "draft";
  isFeatured: boolean;
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
    tier: "daily",
    category: "music",
    followers: 184_000,
    medianViews: 42_500,
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
    tier: "daily",
    category: "food",
    followers: 612_000,
    medianViews: 128_000,
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
    tier: "weekly",
    category: "sports",
    followers: 39_500,
    medianViews: 11_200,
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
    tier: "daily",
    category: "music",
    followers: 92_300,
    medianViews: 18_800,
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
    tier: "weekly",
    category: "music",
    followers: 1_240_000,
    medianViews: 305_000,
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
    tier: "daily",
    category: "lifestyle",
    followers: 22_100,
    medianViews: 6_400,
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
    tier: "weekly",
    category: "beauty",
    followers: 268_000,
    medianViews: 51_300,
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
    tier: "daily",
    category: "tech",
    followers: 73_400,
    medianViews: 15_600,
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
      "One-off snapshot for the @quietmornings momentum spike, paused after first send.",
    scope: "Account · @quietmornings",
    scopeKind: "account",
    cadence: "one-off",
    schedule: "—",
    recipients: 1,
    recipientEmails: ["josh@exhalestudios.co"],
    status: "draft",
    isFeatured: false,
    lastSentAt: null,
    accountIds: ["acc_06"],
    history: [],
  },
];

export function findReport(id: string) {
  return placeholderReports.find((r) => r.id === id) ?? null;
}

export function accountsForReport(report: Report) {
  return report.accountIds
    .map((id) => placeholderAccounts.find((a) => a.id === id))
    .filter((a): a is Account => Boolean(a));
}
