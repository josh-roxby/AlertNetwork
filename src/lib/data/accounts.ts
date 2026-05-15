import { supabaseBrowser } from "@/lib/supabase";
import { ensureCategory } from "@/lib/data/categories";
import { ensureTag, setAccountTags } from "@/lib/data/tags";
import type { AccountRow, AccountView, CategoryRow } from "@/lib/data/types";

// Parse a TikTok profile URL into a handle. Returns `null` when the
// URL doesn't match a recognisable shape — callers should treat that
// as a validation error.
export function parseTikTokHandle(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!/tiktok\.com$/i.test(u.hostname.replace(/^www\./, ""))) return null;
    // Path like /@handle or /@handle/video/123…
    const seg = u.pathname.split("/").filter(Boolean)[0];
    if (!seg?.startsWith("@")) return null;
    return seg.toLowerCase();
  } catch {
    return null;
  }
}

// Canonicalise a TikTok URL before storage: lowercase, drop query +
// hash, collapse the profile path to `https://www.tiktok.com/@handle`.
// Returns `null` if the URL isn't a recognisable TikTok profile.
export function normaliseTikTokUrl(url: string): string | null {
  const handle = parseTikTokHandle(url);
  if (!handle) return null;
  return `https://www.tiktok.com/${handle}`;
}

type AccountJoinedRow = AccountRow & {
  category: CategoryRow | null;
  account_tags: { tag: { label: string } | null }[];
};

function hydrate(row: AccountJoinedRow): AccountView {
  return {
    ...row,
    category: row.category ?? null,
    tagLabels:
      row.account_tags
        ?.map((at) => at.tag?.label)
        .filter((l): l is string => Boolean(l)) ?? [],
  };
}

export async function listAccounts(
  projectId: string,
): Promise<AccountView[]> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "*, category:categories(*), account_tags(tag:tags(label))",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as AccountJoinedRow[]).map(hydrate);
}

export async function getAccount(id: string): Promise<AccountView | null> {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("accounts")
    .select("*, category:categories(*), account_tags(tag:tags(label))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return hydrate(data as AccountJoinedRow);
}

export async function createAccount(input: {
  projectId: string;
  url: string;
  // Either an existing category id or a new label to ensureCategory().
  categoryId?: string;
  newCategoryLabel?: string;
  // Free-text tag labels. ensureTag() turns them into rows.
  tagLabels?: string[];
}): Promise<AccountView> {
  const supabase = supabaseBrowser();

  const handle = parseTikTokHandle(input.url);
  if (!handle) {
    throw new Error("That doesn't look like a TikTok profile URL");
  }

  // Store a canonical URL only — lowercase, no query/hash, just the
  // profile path. Keeps deduplication and Apify input clean.
  const canonicalUrl = normaliseTikTokUrl(input.url);
  if (!canonicalUrl) {
    throw new Error("That doesn't look like a TikTok profile URL");
  }

  let category_id = input.categoryId ?? null;
  if (!category_id && input.newCategoryLabel?.trim()) {
    const cat = await ensureCategory(input.projectId, input.newCategoryLabel);
    category_id = cat.id;
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      project_id: input.projectId,
      handle,
      display_name: handle.replace(/^@/, ""),
      platform: "tiktok",
      url: canonicalUrl,
      category_id,
    })
    .select()
    .single();

  if (error) throw error;
  const account = data as AccountRow;

  if (input.tagLabels?.length) {
    const tagRows = await Promise.all(
      input.tagLabels.map((label) => ensureTag(input.projectId, label)),
    );
    await setAccountTags(
      account.id,
      tagRows.map((t) => t.id),
    );
  }

  // Re-fetch with joins so the caller gets the full view shape.
  const view = await getAccount(account.id);
  if (!view) throw new Error("Account created but could not be re-read");
  return view;
}

export async function updateAccount(
  id: string,
  patch: { category_id?: string | null },
): Promise<void> {
  const supabase = supabaseBrowser();
  const { error } = await supabase
    .from("accounts")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = supabaseBrowser();
  // ON DELETE CASCADE on posts + account_tags + report_accounts in
  // the schema cleans up the joins, so a single delete is enough.
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

// Kick the server-side scrape route for a single account. The route
// runs Apify and upserts posts. Returns either the summary
// (`{ scanned, written, windowHours }`) on success, or an error
// string. Used by AddAccountSheet's fire-and-forget backfill and the
// "Rescan" button on AccountDetail.
export type ScrapeResult =
  | {
      ok: true;
      scanned: number;
      mapped: number;
      written: number;
      windowHours: number;
      diagnosticKeys?: string[];
    }
  | {
      ok: false;
      error: string;
      status: number;
      scanned?: number;
      mapped?: number;
      written?: number;
    };

export async function triggerAccountScrape(
  accountId: string,
  windowHours: number = 48,
): Promise<ScrapeResult> {
  try {
    const res = await fetch("/api/scrape/tiktok-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, windowHours }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      scanned?: number;
      mapped?: number;
      written?: number;
      error?: string;
      windowHours?: number;
      diagnosticKeys?: string[];
    };
    if (!res.ok) {
      return {
        ok: false,
        error: body.error ?? `Scrape failed (${res.status})`,
        status: res.status,
        scanned: body.scanned,
        mapped: body.mapped,
        written: body.written,
      };
    }
    return {
      ok: true,
      scanned: body.scanned ?? 0,
      mapped: body.mapped ?? 0,
      written: body.written ?? 0,
      windowHours: body.windowHours ?? windowHours,
      diagnosticKeys: body.diagnosticKeys,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
      status: 0,
    };
  }
}
