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
