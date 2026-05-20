import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ReportView } from "@/components/report-view";
import { PasswordGate } from "@/components/password-gate";
import { computeAccountHealth } from "@/lib/data/health";
import { isoDaysAgo } from "@/lib/time";
import {
  windowDaysFor,
  type ReportSnapshotV1,
} from "@/lib/data/report-snapshot";
import type {
  AccountView,
  HealthConfig,
  PostRow,
  ReportRow,
} from "@/lib/data/types";

// Shareable / printable view. Public — anyone with the URL can hit
// it. If the report has a password set, a cookie issued by the
// /unlock endpoint must be present.
//
// Reads run on the service-role client because share links work for
// non-authenticated viewers; RLS would block the row otherwise.
// Owners can still hit this from inside the app — the data is the
// same either way.

export default async function ReportViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyId?: string }>;
}) {
  const { id } = await params;
  const { historyId } = await searchParams;

  const admin = supabaseAdmin();
  const { data: report, error } = await admin
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !report) notFound();
  const r = report as ReportRow;

  const windowDays = windowDaysFor(r.cadence);
  const windowCutoff = isoDaysAgo(windowDays);

  // Gate behind the cookie when password_hash is set.
  if (r.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(`anw-report-unlock-${r.id}`);
    if (!cookie) {
      return <PasswordGate reportId={r.id} reportName={r.name} />;
    }
  }

  // If the user opened a specific history row AND that row has a
  // frozen payload (i.e. it was sent after migration 0003), render
  // exactly the numbers stored at send time. Legacy history rows
  // without payload fall through to the live-data path below.
  if (historyId) {
    const { data: h } = await admin
      .from("report_history")
      .select("sent_at, payload")
      .eq("id", historyId)
      .eq("report_id", r.id)
      .maybeSingle();
    const payload = (h?.payload as ReportSnapshotV1 | null) ?? null;
    if (h && payload && payload.version === 1) {
      return (
        <ReportView
          report={r}
          enriched={enrichedFromSnapshot(payload)}
          postsByAccount={postsByAccountFromSnapshot(payload)}
          historySentAt={(h.sent_at as string) ?? null}
        />
      );
    }
  }

  // Resolve scoped accounts via the join tables / project.
  const accountIds = await resolveScope(admin, r);

  const [accountsRes, postsRes, projectRes] = await Promise.all([
    accountIds.length > 0
      ? admin
          .from("accounts")
          .select("*, category:categories(*)")
          .in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    accountIds.length > 0
      ? admin
          .from("posts")
          .select(
            "id, account_id, platform_post_id, posted_at, url, caption, views, likes, comments, shares, saves, first_seen_at, last_scraped_at, updated_at",
          )
          .in("account_id", accountIds)
          .gte("posted_at", windowCutoff)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("projects")
      .select("health_config")
      .eq("id", r.project_id)
      .maybeSingle(),
  ]);

  const accounts = ((accountsRes.data ?? []) as AccountView[]).map((a) => ({
    ...a,
    tagLabels: [], // not needed for the view layout
  }));
  const posts = (postsRes.data ?? []) as PostRow[];
  const healthConfig: HealthConfig | null =
    (projectRes.data?.health_config as HealthConfig | null) ?? null;

  // Bucket posts by account for the renderer.
  const postsByAccount = new Map<string, PostRow[]>();
  for (const p of posts) {
    const arr = postsByAccount.get(p.account_id);
    if (arr) arr.push(p);
    else postsByAccount.set(p.account_id, [p]);
  }

  // Pre-compute health per account so the renderer stays simple.
  const enriched = accounts.map((a) => ({
    account: a,
    health: computeAccountHealth(
      postsByAccount.get(a.id) ?? [],
      healthConfig,
      windowDays,
    ),
  }));

  // Legacy fall-through: history rows from before 0003_report_history_payload
  // don't have a payload, so render live data while still surfacing the
  // history date in the document header.
  let historySentAt: string | null = null;
  if (historyId) {
    const { data: h } = await admin
      .from("report_history")
      .select("sent_at")
      .eq("id", historyId)
      .eq("report_id", r.id)
      .maybeSingle();
    historySentAt = (h?.sent_at as string | undefined) ?? null;
  }

  return (
    <ReportView
      report={r}
      enriched={enriched}
      postsByAccount={postsByAccount}
      historySentAt={historySentAt}
    />
  );
}

// Adapt a stored ReportSnapshotV1 back into the EnrichedAccount[]
// shape the ReportView component expects. The renderer is unchanged —
// it just gets fed reconstructed objects instead of live ones.
function enrichedFromSnapshot(s: ReportSnapshotV1) {
  return s.accounts.map((a) => {
    const account: AccountView = {
      id: a.id,
      project_id: "",
      handle: a.handle,
      display_name: a.display_name,
      platform: "tiktok",
      url: a.url,
      category_id: a.category_id,
      followers: null,
      last_logged_at: null,
      last_scraped_at: null,
      created_at: s.generated_at,
      updated_at: s.generated_at,
      category: a.category_id
        ? {
            id: a.category_id,
            project_id: "",
            label: a.category_label ?? "",
            palette_id: a.category_palette_id ?? "",
            created_at: s.generated_at,
          }
        : null,
      tagLabels: [],
    };
    return { account, health: a.health };
  });
}

// Same — rebuild the post buckets from snapshot.top_posts. We only
// snapshot the top 5, so the view's "Top posts" section is faithful
// while the per-account drilldown drops back to whatever's stored.
function postsByAccountFromSnapshot(
  s: ReportSnapshotV1,
): Map<string, PostRow[]> {
  const map = new Map<string, PostRow[]>();
  for (const p of s.top_posts) {
    const row: PostRow = {
      id: p.id,
      account_id: p.account_id,
      platform_post_id: p.id,
      posted_at: p.posted_at,
      url: p.url,
      caption: p.caption,
      views: p.views,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      saves: 0,
      first_seen_at: p.posted_at,
      last_scraped_at: s.generated_at,
      updated_at: s.generated_at,
    };
    const arr = map.get(p.account_id);
    if (arr) arr.push(row);
    else map.set(p.account_id, [row]);
  }
  return map;
}

async function resolveScope(
  admin: ReturnType<typeof supabaseAdmin>,
  r: ReportRow,
): Promise<string[]> {
  if (r.scope_kind === "project") {
    const { data } = await admin
      .from("accounts")
      .select("id")
      .eq("project_id", r.project_id);
    return (data ?? []).map((row) => row.id as string);
  }
  if (r.scope_kind === "account") {
    const { data } = await admin
      .from("report_accounts")
      .select("account_id")
      .eq("report_id", r.id);
    return (data ?? []).map((row) => row.account_id as string);
  }
  if (r.scope_kind === "category") {
    const { data: rc } = await admin
      .from("report_categories")
      .select("category_id")
      .eq("report_id", r.id);
    const categoryIds = (rc ?? []).map((row) => row.category_id as string);
    if (categoryIds.length === 0) return [];
    const { data } = await admin
      .from("accounts")
      .select("id")
      .eq("project_id", r.project_id)
      .in("category_id", categoryIds);
    return (data ?? []).map((row) => row.id as string);
  }
  return [];
}
