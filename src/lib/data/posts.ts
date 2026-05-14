// This module is dual-purpose:
//   - `upsertPosts` + `bumpAccountLastScraped` run server-side with the
//     service-role client (so the cron path bypasses RLS).
//   - `listPostsForAccount` / `listRecentPostsForProject` run from the
//     browser with the anon client (RLS gated).
//
// We deliberately do NOT add `import "server-only"` so the browser
// helpers can import this file. The two server-side mutators take the
// admin SupabaseClient as a parameter, keeping the service-role key
// out of the bundle.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase";
import type { PostMapped } from "@/lib/apify/tiktok";
import type { AccountPostStats, PostRow } from "@/lib/data/types";

// Upsert scrape results into the `posts` table. Conflict resolution
// keys on (account_id, platform_post_id) — the unique constraint
// defined in the initial migration. The `raw` jsonb column retains
// the full Apify payload for forensics / future field extraction.
//
// Pass the **service-role** Supabase client. RLS would otherwise
// block the write when this runs from the cron path without a user
// session, and we want the same code path for user-triggered backfill
// and the daily cron run.

export async function upsertPosts(
  admin: SupabaseClient,
  accountId: string,
  posts: PostMapped[],
): Promise<{ written: number }> {
  if (posts.length === 0) return { written: 0 };

  const now = new Date().toISOString();
  const rows = posts.map((p) => ({
    account_id: accountId,
    platform_post_id: p.platform_post_id,
    posted_at: p.posted_at,
    url: p.url,
    caption: p.caption,
    views: p.views,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    saves: p.saves,
    raw: p.raw,
    last_scraped_at: now,
  }));

  const { error } = await admin
    .from("posts")
    .upsert(rows, { onConflict: "account_id,platform_post_id" });

  if (error) throw error;
  return { written: rows.length };
}

// Stamp the account's `last_scraped_at` so the UI can show how fresh
// the data is. Called after a successful scrape regardless of how
// many posts came back.
export async function bumpAccountLastScraped(
  admin: SupabaseClient,
  accountId: string,
): Promise<void> {
  const { error } = await admin
    .from("accounts")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", accountId);
  if (error) throw error;
}

// Read posts for an account, most recent first. Browser client +
// RLS — anyone calling this has to own the account via its project.
export async function listPostsForAccount(
  accountId: string,
  opts: { limit?: number; sinceHours?: number } = {},
): Promise<PostRow[]> {
  const supabase = supabaseBrowser();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("account_id", accountId)
    .order("posted_at", { ascending: false });

  if (opts.sinceHours && Number.isFinite(opts.sinceHours)) {
    const cutoff = new Date(
      Date.now() - opts.sinceHours * 3600 * 1000,
    ).toISOString();
    query = query.gte("posted_at", cutoff);
  }
  if (opts.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PostRow[];
}

// Compute simple aggregate stats from a posts array. Cheap enough to
// do client-side for the volumes we care about (≤50 posts/account).
export function accountPostStats(posts: PostRow[]): AccountPostStats {
  if (posts.length === 0) {
    return {
      postCount: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      medianViews: 0,
      topPost: null,
      latestPost: null,
    };
  }

  const sortedByViews = [...posts].sort((a, b) => b.views - a.views);
  const sortedByDate = [...posts].sort(
    (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime(),
  );
  const views = posts.map((p) => p.views).sort((a, b) => a - b);
  const median =
    views.length === 0
      ? 0
      : views.length % 2 === 0
        ? Math.round((views[views.length / 2 - 1] + views[views.length / 2]) / 2)
        : views[(views.length - 1) / 2];

  return {
    postCount: posts.length,
    totalViews: posts.reduce((s, p) => s + p.views, 0),
    totalLikes: posts.reduce((s, p) => s + p.likes, 0),
    totalComments: posts.reduce((s, p) => s + p.comments, 0),
    medianViews: median,
    topPost: sortedByViews[0] ?? null,
    latestPost: sortedByDate[0] ?? null,
  };
}
