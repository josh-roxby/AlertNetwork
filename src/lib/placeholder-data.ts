// PLACEHOLDER DATA — REMOVE WHEN DATABASE IS WIRED UP.
//
// Everything in this file is mock data used to build and preview the UI before
// the backend exists. Toggle PLACEHOLDER_MODE off (or delete this file and its
// imports) once Postgres + Apify ingestion are in place. See TODO.md.

export const PLACEHOLDER_MODE = true;

export type Tier = "daily" | "weekly" | "hourly";

export type Account = {
  id: string;
  handle: string;
  platform: "tiktok";
  url: string;
  tier: Tier;
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
  scope: string;
  cadence: "one-off" | "weekly" | "monthly";
  recipients: number;
  lastSentAt: string | null;
};

export const placeholderAccounts: Account[] = [
  {
    id: "acc_01",
    handle: "@northlight",
    platform: "tiktok",
    url: "https://www.tiktok.com/@northlight",
    tier: "daily",
    followers: 184_000,
    medianViews: 42_500,
    engagementRatio: 0.071,
    postsPerCycle: 1.2,
    healthScore: 82,
    trendDelta: 6.4,
    tags: ["music", "indie", "uk"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
  {
    id: "acc_02",
    handle: "@sundaykitchen",
    platform: "tiktok",
    url: "https://www.tiktok.com/@sundaykitchen",
    tier: "daily",
    followers: 612_000,
    medianViews: 128_000,
    engagementRatio: 0.054,
    postsPerCycle: 0.8,
    healthScore: 74,
    trendDelta: -2.1,
    tags: ["food", "lifestyle"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
  {
    id: "acc_03",
    handle: "@parkrunpete",
    platform: "tiktok",
    url: "https://www.tiktok.com/@parkrunpete",
    tier: "weekly",
    followers: 39_500,
    medianViews: 11_200,
    engagementRatio: 0.092,
    postsPerCycle: 3.4,
    healthScore: 68,
    trendDelta: 18.7,
    tags: ["fitness", "micro"],
    lastLoggedAt: "2026-05-10T08:00:00Z",
  },
  {
    id: "acc_04",
    handle: "@cassette.daily",
    platform: "tiktok",
    url: "https://www.tiktok.com/@cassette.daily",
    tier: "daily",
    followers: 92_300,
    medianViews: 18_800,
    engagementRatio: 0.041,
    postsPerCycle: 0.9,
    healthScore: 51,
    trendDelta: -8.3,
    tags: ["music", "archive"],
    lastLoggedAt: "2026-05-12T08:00:00Z",
  },
  {
    id: "acc_05",
    handle: "@studio.exhale",
    platform: "tiktok",
    url: "https://www.tiktok.com/@studio.exhale",
    tier: "weekly",
    followers: 1_240_000,
    medianViews: 305_000,
    engagementRatio: 0.038,
    postsPerCycle: 0.6,
    healthScore: 79,
    trendDelta: 1.2,
    tags: ["partner", "music"],
    lastLoggedAt: "2026-05-10T08:00:00Z",
  },
  {
    id: "acc_06",
    handle: "@quietmornings",
    platform: "tiktok",
    url: "https://www.tiktok.com/@quietmornings",
    tier: "daily",
    followers: 22_100,
    medianViews: 6_400,
    engagementRatio: 0.118,
    postsPerCycle: 2.1,
    healthScore: 64,
    trendDelta: 22.4,
    tags: ["lifestyle", "micro"],
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
    scope: "Project · Client X Watchlist",
    cadence: "monthly",
    recipients: 3,
    lastSentAt: "2026-05-01T08:05:00Z",
  },
  {
    id: "rep_02",
    name: "Indie music weekly",
    scope: "Tag · music",
    cadence: "weekly",
    recipients: 5,
    lastSentAt: "2026-05-12T08:10:00Z",
  },
  {
    id: "rep_03",
    name: "Quiet Mornings spike check",
    scope: "Account · @quietmornings",
    cadence: "one-off",
    recipients: 1,
    lastSentAt: null,
  },
];
