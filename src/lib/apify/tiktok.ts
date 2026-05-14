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

// Best-effort shape — the actor returns a mix of fields between
// versions, so we treat the payload as unknown and pluck what we need.
export type ApifyTikTokPost = {
  id?: string;
  videoId?: string;
  createTime?: number; // unix seconds
  createTimeISO?: string;
  text?: string;
  webVideoUrl?: string;
  shareUrl?: string;
  playCount?: number;
  viewCount?: number;
  diggCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  collectCount?: number;
  saveCount?: number;
  authorMeta?: { fans?: number; name?: string };
  [key: string]: unknown;
};

export type ScrapeOptions = {
  url: string;
  maxItems?: number;
};

export async function scrapeTikTokUrl(
  opts: ScrapeOptions,
): Promise<ApifyTikTokPost[]> {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error("APIFY_API_KEY is not set");

  const url = new URL(APIFY_ENDPOINT);
  url.searchParams.set("token", token);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [opts.url],
      maxItems: opts.maxItems ?? 50,
    }),
    // Apify sync calls are long-running; let Vercel hold the connection
    // for up to the route's maxDuration.
    signal: AbortSignal.timeout?.(55_000) ?? undefined,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as ApifyTikTokPost[];
  return Array.isArray(data) ? data : [];
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
  const platform_post_id = p.id ?? p.videoId;
  if (!platform_post_id) return null;

  // Apify returns seconds since epoch; some variants use ISO strings.
  let posted_at: string | null = null;
  if (typeof p.createTime === "number") {
    posted_at = new Date(p.createTime * 1000).toISOString();
  } else if (typeof p.createTimeISO === "string") {
    posted_at = p.createTimeISO;
  }
  if (!posted_at) return null;

  return {
    platform_post_id,
    posted_at,
    url: p.webVideoUrl ?? p.shareUrl ?? null,
    caption: p.text ?? null,
    views: numberOr0(p.playCount, p.viewCount),
    likes: numberOr0(p.diggCount, p.likeCount),
    comments: numberOr0(p.commentCount),
    shares: numberOr0(p.shareCount),
    saves: numberOr0(p.collectCount, p.saveCount),
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
// account is added.
export function filterByWindow(
  posts: PostMapped[],
  windowHours: number,
  now: Date = new Date(),
): PostMapped[] {
  const cutoff = now.getTime() - windowHours * 3600 * 1000;
  return posts.filter((p) => new Date(p.posted_at).getTime() >= cutoff);
}
