"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getReportScopeIds,
  listReportHistory,
  updateReport,
} from "@/lib/data/reports";
import {
  averageHealth,
  BAND_BG,
  BAND_LABEL,
  computeAccountHealth,
} from "@/lib/data/health";
import { windowDaysFor } from "@/lib/data/report-snapshot";
import { dailySeries } from "@/lib/data/posts";
import { compactNumber, percent, relativeDate } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_MARGIN,
  ChartCard,
  ChartTooltip,
  X_AXIS,
  Y_AXIS,
} from "@/components/charts";
import { StatsGrid } from "@/components/stats-grid";
import { paletteBg } from "@/lib/data/palette";
import { TabNav } from "@/components/tab-nav";
import { useShell, useActiveProject } from "@/components/shell-context";
import { IconChevronRight, IconEye } from "@/components/icons";
import { Star } from "@/components/star";
import type {
  AccountView,
  CategoryRow,
  HealthConfig,
  PostRow,
  ReportHistoryRow,
  ReportRow,
} from "@/lib/data/types";

const CADENCE_LABEL: Record<ReportRow["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

const STATUS_STYLE: Record<
  string,
  { wrap: string; dot: string; label: string }
> = {
  active: {
    wrap: "bg-good-soft text-good",
    dot: "bg-good pulse-dot",
    label: "Live",
  },
  paused: {
    wrap: "bg-surface-3 text-ink-3",
    dot: "bg-ink-3",
    label: "Paused",
  },
  draft: {
    wrap: "bg-accent-soft text-accent",
    dot: "bg-accent",
    label: "Draft",
  },
};

const SCOPE_LABEL: Record<ReportRow["scope_kind"], string> = {
  project: "Whole project",
  category: "Categories",
  account: "Accounts",
};

type ReportTab = "recent" | "history" | "settings";

export function ReportDetail({ reportId }: { reportId: string }) {
  const {
    reports,
    reportsLoading,
    accounts,
    postsByAccount,
    categories,
    openSheet,
    refreshReports,
    canManage,
  } = useShell();
  const activeProject = useActiveProject();
  const healthConfig: HealthConfig | null = activeProject?.health_config ?? null;

  const report = useMemo(
    () => reports.find((r) => r.id === reportId) ?? null,
    [reports, reportId],
  );

  const [tab, setTab] = useState<ReportTab>("recent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Resolve the scoped accounts. For project scope this is every
  // account in the project (synchronous from context). For category /
  // account scopes we hit the join tables. Re-resolves when the
  // report's scope changes.
  const [scopedIds, setScopedIds] = useState<string[] | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!report) {
      setScopedIds(null);
      return;
    }
    if (report.scope_kind === "project") {
      setScopedIds(accounts.map((a) => a.id));
      return;
    }
    let cancelled = false;
    if (report.scope_kind === "account") {
      getReportScopeIds(report.id, "account")
        .then((ids) => {
          if (!cancelled) setScopedIds(ids);
        })
        .catch(() => {
          if (!cancelled) setScopedIds([]);
        });
    } else if (report.scope_kind === "category") {
      getReportScopeIds(report.id, "category")
        .then((catIds) => {
          if (cancelled) return;
          const ids = accounts
            .filter(
              (a) => a.category_id && catIds.includes(a.category_id),
            )
            .map((a) => a.id);
          setScopedIds(ids);
        })
        .catch(() => {
          if (!cancelled) setScopedIds([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [report, accounts]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Report send history. Reloads whenever last_sent_at changes (i.e.
  // the report just generated via cron or the Manage sheet's
  // run-now action), so the History tab updates without a manual
  // refresh.
  const [history, setHistory] = useState<ReportHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!report) return;
    let cancelled = false;
    setHistoryLoading(true);
    listReportHistory(report.id)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // We only re-fetch when the report's id or last_sent_at changes;
    // other ReportRow fields don't affect history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, report?.last_sent_at]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function toggleFeatured() {
    if (!report) return;
    setBusy(true);
    setError("");
    try {
      await updateReport(report.id, { is_featured: !report.is_featured });
      await refreshReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update.");
    } finally {
      setBusy(false);
    }
  }

  if (reportsLoading && !report) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-ink-3">
        <span className="t-small">Loading report…</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-md border border-line bg-surface px-4 py-8 text-center">
        <p className="t-body text-ink-2">Report not found.</p>
        <Link
          href="/reports"
          className="tap-btn mt-3 inline-block t-small text-accent hover:opacity-80"
        >
          ← Back to reports
        </Link>
      </div>
    );
  }

  const s = STATUS_STYLE[report.status] ?? STATUS_STYLE.draft;
  const scopedAccounts = scopedIds
    ? accounts.filter((a) => scopedIds.includes(a.id))
    : [];
  const avg =
    scopedIds && scopedIds.length > 0
      ? averageHealth(postsByAccount, scopedIds, healthConfig)
      : null;

  return (
    <>
      <section className="mb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${s.wrap}`}
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
          />
          {s.label}
        </span>
        <div className="mt-2 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="t-display-3 truncate uppercase text-ink">
              {report.name}
            </h1>
            {report.description && (
              <p className="mt-1 t-small text-ink-2">{report.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={toggleFeatured}
            disabled={busy}
            aria-pressed={report.is_featured}
            aria-label={
              report.is_featured ? "Unmark as featured" : "Mark as featured"
            }
            title={
              report.is_featured ? "Unmark as featured" : "Mark as featured"
            }
            className={`tap-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
              report.is_featured
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line-2 bg-surface text-ink-3 hover:text-ink"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Star filled={report.is_featured} />
          </button>
        </div>
      </section>

      <section className="mb-5 flex flex-col divide-y divide-line rounded-md border border-line bg-surface">
        <StatRow label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <StatRow
          label="Scope"
          value={
            scopedIds
              ? `${SCOPE_LABEL[report.scope_kind]} · ${scopedIds.length}`
              : SCOPE_LABEL[report.scope_kind]
          }
        />
        <StatRow label="Schedule" value={report.schedule ?? "—"} />
        <StatRow
          label="Last sent"
          value={
            report.last_sent_at ? relativeDate(report.last_sent_at) : "Not sent"
          }
        />
      </section>

      <section className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/reports/${report.id}/view`}
          className="tap-btn flex flex-1 items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          <IconEye stroke="#0A0A0A" />
          Open view
        </Link>
        {canManage && (
          <button
            type="button"
            onClick={() =>
              openSheet({ kind: "manageReport", reportId: report.id })
            }
            className="tap-btn inline-flex items-center justify-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-4 py-3 t-body font-medium text-ink hover:bg-surface-3"
          >
            Manage
          </button>
        )}
      </section>

      {report.status === "draft" && (
        <section className="mb-5 rounded-md border border-accent-line bg-accent-soft px-3 py-2.5 t-small text-accent">
          This report is a draft. Activate it from Manage to schedule sends.
        </section>
      )}

      {error && (
        <p
          className="mb-5 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="mb-3">
        <TabNav<ReportTab>
          tabs={[
            { id: "recent", label: "Recent" },
            {
              id: "history",
              label: `History · ${historyLoading ? "…" : history.length}`,
            },
            { id: "settings", label: "Settings" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </section>

      {tab === "recent" && (
        <RecentTab
          scopedAccounts={scopedAccounts}
          postsByAccount={postsByAccount}
          categories={categories}
          healthConfig={healthConfig}
          windowDays={windowDaysFor(report.cadence)}
          avgHealth={avg?.avgHealth ?? 0}
          avgBand={avg?.band ?? "critical"}
          covered={avg?.covered ?? 0}
        />
      )}

      {tab === "history" && (
        <HistoryTab
          reportId={report.id}
          loading={historyLoading}
          rows={history}
          onOpenManage={
            canManage
              ? () =>
                  openSheet({ kind: "manageReport", reportId: report.id })
              : undefined
          }
        />
      )}

      {tab === "settings" && (
        <SettingsTab
          report={report}
          scopedCount={scopedIds?.length ?? 0}
          onOpenManage={
            canManage
              ? () =>
                  openSheet({ kind: "manageReport", reportId: report.id })
              : undefined
          }
        />
      )}
    </>
  );
}

function RecentTab({
  scopedAccounts,
  postsByAccount,
  categories,
  healthConfig,
  windowDays,
  avgHealth,
  avgBand,
  covered,
}: {
  scopedAccounts: AccountView[];
  postsByAccount: Map<string, PostRow[]>;
  categories: CategoryRow[];
  healthConfig: HealthConfig | null;
  windowDays: number;
  avgHealth: number;
  avgBand: keyof typeof BAND_BG;
  covered: number;
}) {
  if (scopedAccounts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
        <p className="t-body text-ink-2">No accounts in scope.</p>
        <p className="mx-auto mt-1 max-w-[36ch] t-small text-ink-3">
          Edit the report from Manage to pick accounts or categories, or add
          accounts to the project.
        </p>
      </div>
    );
  }

  // Filter posts to the cadence-appropriate window (7d weekly / 30d
  // monthly). computeAccountHealth filters internally but we want the
  // "All posts" / aggregate views to scope the same way. The "now"
  // reference is captured once per render — acceptable impurity, the
  // tab re-renders every time the user opens it.
  const { postsInWindowByAccount, withHealth } = computeWindowedAccounts(
    scopedAccounts,
    postsByAccount,
    healthConfig,
    windowDays,
  );

  // Top 3 only — these are the "highlighted" accounts.
  const top3 = [...withHealth]
    .sort((a, b) => b.health.healthScore - a.health.healthScore)
    .slice(0, 3);

  // Top 5 posts across scoped accounts by views (window-scoped).
  const allPosts: PostRow[] = [];
  for (const ps of postsInWindowByAccount.values()) {
    for (const p of ps) allPosts.push(p);
  }
  const topPosts = [...allPosts].sort((a, b) => b.views - a.views).slice(0, 5);
  const accountById = new Map<string, AccountView>();
  for (const a of scopedAccounts) accountById.set(a.id, a);

  // Group every scoped account by its category. Uncategorised rows
  // fall into a synthetic bucket so they're still visible.
  const byCategory = groupByCategory(withHealth, categories);

  // Aggregate metrics across every scoped account for the active
  // window — same window computeAccountHealth uses internally.
  const totalViews = withHealth.reduce((s, r) => s + r.health.totalViews, 0);
  const totalEngagements = withHealth.reduce(
    (s, r) => s + r.health.totalEngagements,
    0,
  );
  const totalPosts = withHealth.reduce((s, r) => s + r.health.postCount, 0);
  const engagementRate = totalViews > 0 ? totalEngagements / totalViews : 0;

  return (
    <>
      <section className="mb-5">
        <StatsGrid
          stats={[
            { label: "Total views", value: compactNumber(totalViews) },
            { label: "Engagement", value: percent(engagementRate) },
            {
              label: "Avg health",
              value: covered > 0 ? String(avgHealth) : "—",
              // Band stays neutral on purpose — only the label is
              // surfaced. See BAND_BG comment in lib/data/health.ts.
              trend:
                covered > 0
                  ? { kind: "neutral", label: BAND_LABEL[avgBand] }
                  : null,
            },
            { label: `Posts (${windowDays}d)`, value: compactNumber(totalPosts) },
          ]}
        />
        <p
          className="mt-2 t-meta text-right text-ink-3"
          style={{ fontSize: 10 }}
        >
          {covered} of {scopedAccounts.length} accounts scored · {windowDays}-day
          window
        </p>
      </section>

      <section className="mb-5">
        <h3 className="t-micro mb-2 px-1 text-ink-3">Top 3 accounts</h3>
        <ul className="flex flex-col gap-2">
          {top3.map(({ account, health, lastPostedAt }) => (
            <li key={account.id}>
              <AccountStatsBlock
                account={account}
                health={health}
                lastPostedAt={lastPostedAt}
                highlighted
              />
            </li>
          ))}
        </ul>
      </section>

      <ReportTrends
        postsInWindow={allPosts}
        windowDays={windowDays}
      />

      <section className="mb-5">
        <h3 className="t-micro mb-2 px-1 text-ink-3">Top 5 posts</h3>
        {topPosts.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
            <p className="t-body text-ink-2">No posts cached yet.</p>
            <p className="mx-auto mt-1 max-w-[36ch] t-small text-ink-3">
              Run a scrape on one of the scoped accounts to populate.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {topPosts.map((post) => {
              const a = accountById.get(post.account_id);
              const inner = (
                <div className="tap-row flex items-start gap-3 rounded-md border border-line bg-surface px-3 py-3 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span
                      className="block t-body text-ink"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {post.caption?.trim() || "(no caption)"}
                    </span>
                    <span
                      data-numeric
                      className="mt-1 flex flex-wrap gap-x-3 t-meta text-ink-3"
                      style={{ fontSize: 10 }}
                    >
                      {a && <span className="text-ink-2">{a.handle}</span>}
                      <span>{compactNumber(post.views)} views</span>
                      <span>{compactNumber(post.likes)} likes</span>
                      <span>{relativeDate(post.posted_at)}</span>
                    </span>
                  </span>
                  {post.url && (
                    <IconChevronRight className="mt-1 shrink-0 text-ink-3" />
                  )}
                </div>
              );
              return (
                <li key={post.id}>
                  {post.url ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="t-micro mb-2 px-1 text-ink-3">All by category</h3>
        {byCategory.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-6 text-center t-small text-ink-3">
            No accounts to group.
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {byCategory.map((group) => (
              <li key={group.id}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span
                    aria-hidden
                    className={`inline-block h-2 w-2 rounded-full ${paletteBg(group.paletteId)}`}
                  />
                  <span className="t-small font-medium text-ink">
                    {group.label}
                  </span>
                  <span
                    className="t-meta text-ink-3"
                    style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  >
                    {group.accounts.length} account
                    {group.accounts.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {group.accounts.map(({ account, health, lastPostedAt }) => (
                    <li key={account.id}>
                      <AccountStatsBlock
                        account={account}
                        health={health}
                        lastPostedAt={lastPostedAt}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

type AccountHealthRow = {
  account: AccountView;
  health: ReturnType<typeof computeAccountHealth>;
  lastPostedAt: string | null;
};

type CategoryGroup = {
  id: string;
  label: string;
  paletteId: string | null;
  accounts: AccountHealthRow[];
};

function groupByCategory(
  rows: AccountHealthRow[],
  categories: CategoryRow[],
): CategoryGroup[] {
  const byId = new Map<string, CategoryGroup>();
  for (const c of categories) {
    byId.set(c.id, { id: c.id, label: c.label, paletteId: c.palette_id, accounts: [] });
  }
  const uncategorised: CategoryGroup = {
    id: "__none",
    label: "Uncategorised",
    paletteId: null,
    accounts: [],
  };
  for (const row of rows) {
    const catId = row.account.category_id;
    if (catId && byId.has(catId)) {
      byId.get(catId)!.accounts.push(row);
    } else {
      uncategorised.accounts.push(row);
    }
  }
  return [
    ...Array.from(byId.values()).filter((g) => g.accounts.length > 0),
    ...(uncategorised.accounts.length > 0 ? [uncategorised] : []),
  ];
}

// Dense per-account block with the same metrics surface as the
// email: handle + category + health pill on the header, then a 2x4
// stats grid (Posts / Total views / Total eng / ER% / Mean / Median
// / Per wk / Last post). Used in both the "Top 3" callout and the
// "by category" listing so the report page mirrors what landed in
// the inbox.
function AccountStatsBlock({
  account,
  health,
  lastPostedAt,
  highlighted = false,
}: {
  account: AccountView;
  health: ReturnType<typeof computeAccountHealth>;
  lastPostedAt: string | null;
  highlighted?: boolean;
}) {
  const meanViews =
    health.postCount > 0
      ? Math.round(health.totalViews / health.postCount)
      : 0;
  const cells: Array<[string, string]> = [
    ["Posts", String(health.postCount)],
    ["Total views", compactNumber(health.totalViews)],
    ["Total eng.", compactNumber(health.totalEngagements)],
    [
      "ER%",
      health.engagementRate > 0 ? percent(health.engagementRate, 2) : "—",
    ],
    ["Mean", compactNumber(meanViews)],
    ["Median", compactNumber(health.medianViews)],
    ["Per wk", health.postsPerWeek.toFixed(1)],
    ["Last post", relativeLastPost(lastPostedAt, health.postCount)],
  ];

  return (
    <Link
      href={`/accounts/${account.id}`}
      className={`tap-row block rounded-md border transition-colors duration-[120ms] ${
        highlighted
          ? "border-accent-line bg-accent-soft hover:bg-accent-soft"
          : "border-line bg-surface hover:bg-surface-2"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${paletteBg(account.category?.palette_id)}`}
          />
          <div className="min-w-0">
            <div className="truncate t-body font-semibold text-ink">
              {account.handle}
            </div>
            {account.category && (
              <div
                className="t-meta truncate text-ink-3"
                style={{ fontSize: 10 }}
              >
                {account.category.label}
              </div>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 ${BAND_BG[health.band]}`}
          style={{ fontSize: 10, fontWeight: 700 }}
        >
          {health.postCount > 0 ? health.healthScore : "—"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 border-t border-line px-2 py-2.5">
        {cells.map(([label, value]) => (
          <div key={label} className="px-1.5">
            <div
              className="t-micro text-ink-4"
              style={{ fontSize: 9, letterSpacing: "0.04em" }}
            >
              {label.toUpperCase()}
            </div>
            <div
              data-numeric
              className="mt-0.5 text-ink"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

// Pulled out of RecentTab's body so `Date.now()` lives at module
// scope — React Compiler enforces purity inside component renders.
function computeWindowedAccounts(
  scopedAccounts: AccountView[],
  postsByAccount: Map<string, PostRow[]>,
  healthConfig: HealthConfig | null,
  windowDays: number,
): {
  postsInWindowByAccount: Map<string, PostRow[]>;
  withHealth: AccountHealthRow[];
} {
  const cutoff = Date.now() - windowDays * 24 * 3600 * 1000;
  const inWin = new Map<string, PostRow[]>();
  for (const a of scopedAccounts) {
    const ps = (postsByAccount.get(a.id) ?? []).filter(
      (p) => new Date(p.posted_at).getTime() >= cutoff,
    );
    inWin.set(a.id, ps);
  }
  const wh: AccountHealthRow[] = scopedAccounts.map((a) => {
    const accountPosts = postsByAccount.get(a.id) ?? [];
    const health = computeAccountHealth(accountPosts, healthConfig, windowDays);
    const ps = inWin.get(a.id) ?? [];
    let lastPostedAt: string | null = null;
    for (const p of ps) {
      if (!lastPostedAt || p.posted_at > lastPostedAt) {
        lastPostedAt = p.posted_at;
      }
    }
    return { account: a, health, lastPostedAt };
  });
  return { postsInWindowByAccount: inWin, withHealth: wh };
}

function relativeLastPost(
  lastPostedAt: string | null,
  postCount: number,
): string {
  if (!lastPostedAt) return postCount === 0 ? "No posts" : "—";
  const ms = Date.now() - new Date(lastPostedAt).getTime();
  if (ms < 0) return "now";
  const hours = ms / 3600_000;
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 10) return `${days.toFixed(1)}d`;
  return `${Math.round(days)}d`;
}

// Per-day aggregate charts across every post in the report's window.
// Three stacked cards: total views (area), engagement rate (line),
// posts per day (bar). Reuses the same primitives as the per-account
// `/accounts/[id]` page so the two pages feel like siblings.
function ReportTrends({
  postsInWindow,
  windowDays,
}: {
  postsInWindow: PostRow[];
  windowDays: number;
}) {
  if (postsInWindow.length === 0) {
    return null;
  }

  const series = dailySeries(postsInWindow, windowDays);
  const totalViews = series.reduce((s, p) => s + p.views, 0);
  const totalPosts = series.reduce((s, p) => s + p.posts, 0);
  // Engagement rate is weighted by views, so an average-of-daily-rates
  // can mislead on light-traffic days. Re-derive from the totals.
  const totalEng = postsInWindow.reduce(
    (s, p) => s + p.likes + p.comments + p.shares,
    0,
  );
  const avgEngagement = totalViews > 0 ? totalEng / totalViews : 0;
  const rangeLabel = `${windowDays}d`;

  return (
    <section className="mb-5">
      <h3 className="t-micro mb-2 px-1 text-ink-3">Trends</h3>
      <div className="flex flex-col gap-3">
        <ChartCard
          label="Daily views"
          value={compactNumber(totalViews)}
          valueLabel={`total · ${rangeLabel}`}
          chart={
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={series} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient
                    id="report-views-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--accent)"
                      stopOpacity={0.32}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--line)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis {...X_AXIS} />
                <YAxis
                  {...Y_AXIS}
                  width={36}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <Tooltip content={<ChartTooltip formatter={compactNumber} />} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#report-views-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          }
        />

        <ChartCard
          label="Engagement rate"
          value={avgEngagement > 0 ? percent(avgEngagement, 2) : "—"}
          valueLabel={`weighted · ${rangeLabel}`}
          chart={
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={series} margin={CHART_MARGIN}>
                <CartesianGrid
                  stroke="var(--line)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis {...X_AXIS} />
                <YAxis
                  {...Y_AXIS}
                  width={36}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  content={
                    <ChartTooltip formatter={(n: number) => percent(n, 1)} />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="var(--good)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />

        <ChartCard
          label="Posts per day"
          value={totalPosts.toString()}
          valueLabel={`total · ${rangeLabel}`}
          chart={
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={series} margin={CHART_MARGIN}>
                <CartesianGrid
                  stroke="var(--line)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis {...X_AXIS} />
                <YAxis {...Y_AXIS} width={28} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="posts"
                  fill="var(--info)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          }
        />
      </div>
    </section>
  );
}

function HistoryTab({
  reportId,
  loading,
  rows,
  onOpenManage,
}: {
  reportId: string;
  loading: boolean;
  rows: ReportHistoryRow[];
  onOpenManage?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center text-ink-3">
        <span className="t-small">Loading history…</span>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
        <p className="t-body text-ink-2">No sends yet.</p>
        <p className="mx-auto mt-1 max-w-[40ch] t-small text-ink-3">
          {onOpenManage
            ? "History appears here once the cron runs on the next scheduled day, or after a manual run from Manage → Generate now."
            : "History appears here once the cron runs on the next scheduled day."}
        </p>
        {onOpenManage && (
          <button
            type="button"
            onClick={onOpenManage}
            className="tap-btn mt-3 inline-flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 py-1.5 t-small font-medium text-ink hover:bg-surface-3"
          >
            Open manage
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((h) => {
        const delivered = h.status === "delivered";
        return (
          <li key={h.id}>
            <Link
              href={`/reports/${reportId}/view?historyId=${h.id}`}
              className="tap-row flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 hover:bg-surface-2"
            >
              <span
                aria-hidden
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${delivered ? "bg-good" : "bg-bad"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block t-body text-ink">
                  {delivered ? "Delivered" : h.status}
                </span>
                <span
                  data-numeric
                  className="block t-meta text-ink-3"
                  style={{ fontSize: 10 }}
                >
                  {h.accounts} accounts · {h.recipients} recipients
                </span>
              </span>
              <span
                data-numeric
                className="shrink-0 text-right t-small text-ink-3"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {relativeDate(h.sent_at)}
              </span>
              <IconChevronRight className="shrink-0 text-ink-3" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SettingsTab({
  report,
  scopedCount,
  onOpenManage,
}: {
  report: ReportRow;
  scopedCount: number;
  onOpenManage?: () => void;
}) {
  return (
    <section className="rounded-md border border-line bg-surface">
      <SettingRow label="Name" value={report.name} />
      <SettingRow
        label="Description"
        value={report.description || "—"}
      />
      <SettingRow label="Cadence" value={CADENCE_LABEL[report.cadence]} />
      <SettingRow label="Schedule" value={report.schedule ?? "—"} />
      <SettingRow
        label="Scope"
        value={`${SCOPE_LABEL[report.scope_kind]} · ${scopedCount} account${scopedCount === 1 ? "" : "s"}`}
      />
      <SettingRow
        label="Status"
        value={STATUS_STYLE[report.status]?.label ?? report.status}
      />
      <SettingRow
        label="Featured"
        value={report.is_featured ? "Yes" : "No"}
      />
      <SettingRow
        label="Last sent"
        value={
          report.last_sent_at ? relativeDate(report.last_sent_at) : "Not sent"
        }
      />
      {onOpenManage && (
        <div className="border-t border-line px-3 py-3">
          <button
            type="button"
            onClick={onOpenManage}
            className="tap-btn flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
          >
            Edit in Manage
          </button>
        </div>
      )}
    </section>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-3 last:border-b-0">
      <span className="t-micro text-ink-3">{label}</span>
      <span
        data-numeric
        className="min-w-0 truncate text-right text-ink"
        style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="t-small text-ink-3">{label}</div>
      <div
        data-numeric
        className="text-right text-ink"
        style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
      >
        {value}
      </div>
    </div>
  );
}
