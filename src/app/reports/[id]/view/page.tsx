import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ReportView } from "@/components/report-view";
import { PasswordGate } from "@/components/password-gate";
import { computeAccountHealth } from "@/lib/data/health";
import { isoDaysAgo } from "@/lib/time";
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

  const thirtyDaysAgo = isoDaysAgo(30);

  const admin = supabaseAdmin();
  const { data: report, error } = await admin
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !report) notFound();
  const r = report as ReportRow;

  // Gate behind the cookie when password_hash is set.
  if (r.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(`anw-report-unlock-${r.id}`);
    if (!cookie) {
      return <PasswordGate reportId={r.id} reportName={r.name} />;
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
          .gte("posted_at", thirtyDaysAgo)
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
    ),
  }));

  // Optional snapshot context if the user opened a specific history
  // row. We don't have stored snapshots yet so the date is the only
  // historical thing we surface.
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
