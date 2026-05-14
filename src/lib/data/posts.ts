import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostMapped } from "@/lib/apify/tiktok";

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
