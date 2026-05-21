import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  filterByWindow,
  mapApifyPost,
  scrapeTikTokUrl,
  type ApifyTikTokPost,
} from "@/lib/apify/tiktok";
import { bumpAccountLastScraped, upsertPosts } from "@/lib/data/posts";

// Sync calls to the Apify TikTok actor can take up to ~60s for a full
// user feed. Bump Vercel's serverless function limit to match.
export const maxDuration = 60;

type Body = {
  accountId?: string;
  windowHours?: number; // 0 = no filter (write everything Apify returned)
  maxItems?: number;
};

// POST /api/scrape/tiktok-account
//
// Two auth paths:
//   - Logged-in user (Supabase cookie session): must own the account
//     via RLS. Used by AddAccountSheet for the 7-day backfill.
//   - Cron / service callers: pass `Authorization: Bearer
//     ${CRON_SHARED_SECRET}`. Used by the daily 48h scrape.
//
// In both cases the actual posts upsert + account stamp run against
// the service-role client so RLS doesn't gate the cron path.
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.accountId) {
    return NextResponse.json(
      { error: "accountId required" },
      { status: 400 },
    );
  }

  // 0 = "write every post Apify returns"; the per-account backfill
  // sends 0 so we capture everything visible. The daily cron sends
  // 48 so it only adds genuinely new rows.
  const windowHours = body.windowHours ?? 48;
  const maxItems = body.maxItems ?? 50;

  // Auth — cron path first so it can short-circuit the session check.
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SHARED_SECRET;
  const isCron =
    !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Verify the caller is the project owner — RLS now lets viewers
    // SELECT accounts too, and the scrape below runs with service-role
    // so we need an explicit owner check before triggering a write.
    const { data: ownership, error: ownError } = await supabase
      .from("accounts")
      .select("id, projects!inner(owner_id)")
      .eq("id", body.accountId)
      .maybeSingle();
    if (ownError || !ownership) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const ownerId = (
      ownership as unknown as { projects: { owner_id: string } }
    ).projects.owner_id;
    if (ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the project owner can trigger a scrape." },
        { status: 403 },
      );
    }
  }

  const admin = supabaseAdmin();
  const { data: account, error: accError } = await admin
    .from("accounts")
    .select("id, url")
    .eq("id", body.accountId)
    .single();

  if (accError || !account) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let scanned = 0;
  let mappedCount = 0;
  let writtenCount = 0;
  let sampleKeys: string[] = [];
  try {
    const apifyPosts = await scrapeTikTokUrl({
      url: account.url,
      maxItems,
    });
    scanned = apifyPosts.length;

    const mapped = apifyPosts
      .map(mapApifyPost)
      .filter((p): p is NonNullable<typeof p> => p !== null);
    mappedCount = mapped.length;

    // Diagnostic: if Apify returned posts but our mapper bailed for
    // ALL of them, dump the keys + a truncated sample of the first
    // post so Vercel logs reveal the actor's actual schema.
    if (scanned > 0 && mappedCount === 0) {
      const sample = apifyPosts[0] ?? ({} as ApifyTikTokPost);
      sampleKeys = Object.keys(sample);
      const truncated = JSON.stringify(sample).slice(0, 800);
      console.error(
        `[scrape] account=${account.id} mapper bailed for all ${scanned} posts. Keys: ${sampleKeys.join(", ")}. Sample: ${truncated}`,
      );
    }

    const withinWindow = filterByWindow(mapped, windowHours);
    const result = await upsertPosts(admin, account.id, withinWindow);
    writtenCount = result.written;

    await bumpAccountLastScraped(admin, account.id);

    console.info(
      `[scrape] account=${account.id} scanned=${scanned} mapped=${mappedCount} withinWindow=${withinWindow.length} wrote=${writtenCount} window=${windowHours}h`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "scrape failed";
    console.error(`[scrape] account=${account.id} failed: ${message}`);
    return NextResponse.json(
      {
        error: message,
        scanned,
        mapped: mappedCount,
        written: writtenCount,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    scanned,
    mapped: mappedCount,
    written: writtenCount,
    windowHours,
    // When the mapper bailed wholesale, surface the keys so the user
    // can report them without us needing log access.
    diagnosticKeys: sampleKeys.length > 0 ? sampleKeys : undefined,
  });
}
