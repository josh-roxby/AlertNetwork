// Thin wrapper around the Apify `apidojo~tiktok-scraper-api` actor.
// We use the sync endpoint (`run-sync-get-dataset-items`) so the route
// handler can return scraped + persisted data in one shot. Calls can
// take 30-60s for a full user feed; the route handler bumps Vercel's
// maxDuration accordingly.
//
// Apify's `dateRange` field only narrows keyword searches, not
// `startUrls`. The 48h / 7d window is therefore applied server-side
// after the actor returns posts most-recent-first.

const APIFY_ENDPOINT =
  "https://api.apify.com/v2/acts/apidojo~tiktok-scraper-api/run-sync-get-dataset-items";

// Best-effort shape — Apify actors evolve their output schema and
// different versions of `apidojo~tiktok-scraper-api` return subtly
// different field names. We treat the payload as a permissive bag and
// try multiple aliases for every field we care about.
//
// Current shape (May 2026) uses `channel.*`, `title`, `postPage`,
// `uploadedAt`, `bookmarks`. Prior shapes used `authorMeta.*` /
// `author.*`, `text`/`desc`, `webVideoUrl`, `createTime`,
// `collectCount`. We accept both so an actor revert doesn't break us.
export type ApifyTikTokPost = {
  // IDs across actor versions
  id?: string | number;
  videoId?: string | number;
  itemId?: string | number;
  awemeId?: string | number;
  aweme_id?: string | number;

  // Timestamps across actor versions
  createTime?: number | string;
  createTimeISO?: string;
  uploadedAt?: string | number;
  uploadedAtFormatted?: string;
  createdAt?: string | number;
  created_at?: string | number;
  publishTime?: string | number;

  // Captions
  title?: string;
  text?: string;
  desc?: string;
  description?: string;

  // URLs
  postPage?: string;
  webVideoUrl?: string;
  shareUrl?: string;
  videoUrl?: string;
  submittedVideoUrl?: string;

  // Metrics
  playCount?: number;
  viewCount?: number;
  views?: number;
  diggCount?: number;
  likeCount?: number;
  likes?: number;
  commentCount?: number;
  comments?: number;
  shareCount?: number;
  shares?: number;
  collectCount?: number;
  saveCount?: number;
  saves?: number;
  bookmarks?: number;

  // Authorship (different shapes across actor versions)
  username?: string;
  channel?: {
    id?: string | number;
    name?: string;
    username?: string;
    followers?: number;
    verified?: boolean;
  };
  authorMeta?: {
    fans?: number;
    name?: string;
    uniqueId?: string;
    unique_id?: string;
    nickName?: string;
    nickname?: string;
  };
  author?: {
    uniqueId?: string;
    unique_id?: string;
    nickname?: string;
    username?: string;
  };

  [key: string]: unknown;
};

export type ScrapeOptions = {
  urls: string[];
  maxItems?: number;
  timeoutMs?: number;
};

export async function scrapeTikTokUrls(
  opts: ScrapeOptions,
): Promise<ApifyTikTokPost[]> {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error("APIFY_API_KEY is not set");
  if (opts.urls.length === 0) return [];

  const url = new URL(APIFY_ENDPOINT);
  url.searchParams.set("token", token);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: opts.urls,
      maxItems: opts.maxItems ?? 50 * opts.urls.length,
    }),
    signal:
      AbortSignal.timeout?.(opts.timeoutMs ?? 55_000) ?? undefined,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as ApifyTikTokPost[];
  return Array.isArray(data) ? data : [];
}

// Single-URL convenience wrapper used by /api/scrape/tiktok-account.
export async function scrapeTikTokUrl(opts: {
  url: string;
  maxItems?: number;
}): Promise<ApifyTikTokPost[]> {
  return scrapeTikTokUrls({
    urls: [opts.url],
    maxItems: opts.maxItems,
  });
}

// Pluck the TikTok handle from a post payload. Tries every author-ish
// field we've seen across actor versions and returns a lowercase
// handle without the leading `@`.
export function postHandle(p: ApifyTikTokPost): string | null {
  const raw =
    p.channel?.username ??
    p.channel?.name ??
    p.authorMeta?.uniqueId ??
    p.authorMeta?.unique_id ??
    p.authorMeta?.name ??
    p.authorMeta?.nickName ??
    p.authorMeta?.nickname ??
    p.author?.uniqueId ??
    p.author?.unique_id ??
    p.author?.username ??
    p.author?.nickname ??
    p.username ??
    null;
  if (!raw) return null;
  return String(raw).toLowerCase().replace(/^@/, "");
}

// Map an Apify post to the columns of the `posts` table. Returns null
// when the post is missing both an ID and a parseable timestamp.
export type PostMapped = {
  platform_post_id: string;
  posted_at: string;
  url: string | null;
  caption: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  raw: ApifyTikTokPost;
};

export function mapApifyPost(p: ApifyTikTokPost): PostMapped | null {
  // ID candidates
  const idCandidate =
    p.id ?? p.videoId ?? p.itemId ?? p.awemeId ?? p.aweme_id;
  if (idCandidate === undefined || idCandidate === null) return null;
  const platform_post_id = String(idCandidate);
  if (!platform_post_id) return null;

  // Time candidates, in priority order. parseTimestamp returns ISO
  // string or null. We accept any field that parses to a valid Date.
  const posted_at =
    parseTimestamp(p.createTime) ??
    parseTimestamp(p.createTimeISO) ??
    parseTimestamp(p.uploadedAt) ??
    parseTimestamp(p.uploadedAtFormatted) ??
    parseTimestamp(p.createdAt) ??
    parseTimestamp(p.created_at) ??
    parseTimestamp(p.publishTime);
  if (!posted_at) return null;

  return {
    platform_post_id,
    posted_at,
    url:
      p.postPage ??
      p.webVideoUrl ??
      p.videoUrl ??
      p.shareUrl ??
      p.submittedVideoUrl ??
      null,
    caption: p.title ?? p.text ?? p.desc ?? p.description ?? null,
    views: numberOr0(p.playCount, p.viewCount, p.views),
    likes: numberOr0(p.diggCount, p.likeCount, p.likes),
    comments: numberOr0(p.commentCount, p.comments),
    shares: numberOr0(p.shareCount, p.shares),
    saves: numberOr0(p.collectCount, p.saveCount, p.saves, p.bookmarks),
    raw: p,
  };
}

// Permissive timestamp parser — accepts unix seconds, unix
// milliseconds, ISO strings, and numeric strings.
function parseTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  if (typeof value === "string") {
    if (!value.trim()) return null;
    const asNum = Number(value);
    if (Number.isFinite(asNum) && asNum > 0) {
      const ms = asNum > 1e12 ? asNum : asNum * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}

function numberOr0(...candidates: (number | undefined | null)[]): number {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  return 0;
}

// Filter mapped posts to those within `windowHours` of now. Used to
// scope the daily 48h scrape vs. the 7d backfill triggered when an
// account is added. Pass Infinity (or a very large number) to disable
// filtering — useful for backfills where we want every returned post.
export function filterByWindow(
  posts: PostMapped[],
  windowHours: number,
  now: Date = new Date(),
): PostMapped[] {
  if (!Number.isFinite(windowHours) || windowHours <= 0) return posts;
  const cutoff = now.getTime() - windowHours * 3600 * 1000;
  return posts.filter((p) => new Date(p.posted_at).getTime() >= cutoff);
}
