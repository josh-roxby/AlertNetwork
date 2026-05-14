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
// pull what we need with multiple aliases.
export type ApifyTikTokPost = {
  id?: string | number;
  videoId?: string | number;
  itemId?: string | number;
  awemeId?: string | number;
  aweme_id?: string | number;
  createTime?: number | string;
  createTimeISO?: string;
  text?: string;
  desc?: string;
  webVideoUrl?: string;
  shareUrl?: string;
  videoUrl?: string;
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
    // Apify sync calls are long-running; let Vercel hold the connection
    // for up to the caller-provided timeout (default ~55s for the
    // 60s per-account route).
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

// Pluck the TikTok handle from a post payload. Apify varies the field
// between actor versions — try the common ones in priority order and
// return a lowercase handle without the leading `@`.
export function postHandle(p: ApifyTikTokPost): string | null {
  const raw =
    p.authorMeta?.uniqueId ??
    p.authorMeta?.unique_id ??
    p.authorMeta?.name ??
    p.authorMeta?.nickName ??
    p.authorMeta?.nickname ??
    p.author?.uniqueId ??
    p.author?.unique_id ??
    p.author?.nickname ??
    null;
  if (!raw) return null;
  return String(raw).toLowerCase().replace(/^@/, "");
}

// Map an Apify post to the columns of the `posts` table. Returns null
// when the post is missing the IDs we need to dedupe on.
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
  // ID can live under several names depending on actor version.
  const idCandidate =
    p.id ?? p.videoId ?? p.itemId ?? p.awemeId ?? p.aweme_id;
  if (idCandidate === undefined || idCandidate === null) return null;
  const platform_post_id = String(idCandidate);
  if (!platform_post_id) return null;

  // createTime is most commonly unix seconds, but we've seen
  // millisecond ints, ISO strings, and the dedicated createTimeISO
  // field. Try them all and bail if none parse to a real Date.
  let posted_at: string | null = null;
  if (typeof p.createTime === "number") {
    // Heuristic: > 1e12 implies millis, otherwise seconds.
    const ms = p.createTime > 1e12 ? p.createTime : p.createTime * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) posted_at = d.toISOString();
  } else if (typeof p.createTimeISO === "string") {
    const d = new Date(p.createTimeISO);
    if (!Number.isNaN(d.getTime())) posted_at = d.toISOString();
  } else if (typeof p.createTime === "string") {
    // Could be a numeric string or an ISO-ish date.
    const asNum = Number(p.createTime);
    if (Number.isFinite(asNum) && asNum > 0) {
      const ms = asNum > 1e12 ? asNum : asNum * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) posted_at = d.toISOString();
    } else {
      const d = new Date(p.createTime);
      if (!Number.isNaN(d.getTime())) posted_at = d.toISOString();
    }
  }
  if (!posted_at) return null;

  return {
    platform_post_id,
    posted_at,
    url: p.webVideoUrl ?? p.shareUrl ?? p.videoUrl ?? null,
    caption: p.text ?? p.desc ?? null,
    views: numberOr0(p.playCount, p.viewCount, p.views),
    likes: numberOr0(p.diggCount, p.likeCount, p.likes),
    comments: numberOr0(p.commentCount, p.comments),
    shares: numberOr0(p.shareCount, p.shares),
    saves: numberOr0(p.collectCount, p.saveCount, p.saves),
    raw: p,
  };
}

function numberOr0(...candidates: (number | undefined | null)[]): number {
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  return 0;
}

// Filter mapped posts to those within `windowHours` of now. Used to
// scope the daily 48h scrape vs. the 7d backfill triggered when an
// account is added. Pass Infinity to disable filtering.
export function filterByWindow(
  posts: PostMapped[],
  windowHours: number,
  now: Date = new Date(),
): PostMapped[] {
  if (!Number.isFinite(windowHours)) return posts;
  const cutoff = now.getTime() - windowHours * 3600 * 1000;
  return posts.filter((p) => new Date(p.posted_at).getTime() >= cutoff);
}
