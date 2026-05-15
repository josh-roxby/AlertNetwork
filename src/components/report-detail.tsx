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
import { compactNumber, relativeDate } from "@/lib/format";
import { paletteBg } from "@/lib/data/palette";
import { TabNav } from "@/components/tab-nav";
import { useShell } from "@/components/shell-context";
import { IconChevronRight, IconEye } from "@/components/icons";
import { Star } from "@/components/star";
import type {
  AccountView,
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
    openSheet,
    refreshReports,
  } = useShell();

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
      ? averageHealth(postsByAccount, scopedIds)
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

      <section className="mb-5 grid grid-cols-2 gap-2">
        <StatCell label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <StatCell
          label="Scope"
          value={
            scopedIds
              ? `${SCOPE_LABEL[report.scope_kind]} · ${scopedIds.length}`
              : SCOPE_LABEL[report.scope_kind]
          }
        />
        <StatCell label="Schedule" value={report.schedule ?? "—"} />
        <StatCell
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
        <button
          type="button"
          onClick={() =>
            openSheet({ kind: "manageReport", reportId: report.id })
          }
          className="tap-btn inline-flex items-center justify-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-4 py-3 t-body font-medium text-ink hover:bg-surface-3"
        >
          Manage
        </button>
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
          avgHealth={avg?.avgHealth ?? 0}
          avgBand={avg?.band ?? "critical"}
          covered={avg?.covered ?? 0}
        />
      )}

      {tab === "history" && (
        <HistoryTab
          loading={historyLoading}
          rows={history}
          onOpenManage={() =>
            openSheet({ kind: "manageReport", reportId: report.id })
          }
        />
      )}

      {tab === "settings" && (
        <SettingsTab
          report={report}
          scopedCount={scopedIds?.length ?? 0}
          onOpenManage={() =>
            openSheet({ kind: "manageReport", reportId: report.id })
          }
        />
      )}
    </>
  );
}

function RecentTab({
  scopedAccounts,
  postsByAccount,
  avgHealth,
  avgBand,
  covered,
}: {
  scopedAccounts: AccountView[];
  postsByAccount: Map<string, PostRow[]>;
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

  // Top 5 accounts by health score.
  const ranked = [...scopedAccounts]
    .map((a) => ({
      account: a,
      health: computeAccountHealth(postsByAccount.get(a.id) ?? []),
    }))
    .sort((a, b) => b.health.healthScore - a.health.healthScore)
    .slice(0, 5);

  // Top 5 posts across scoped accounts by views.
  const allPosts: PostRow[] = [];
  for (const a of scopedAccounts) {
    const ps = postsByAccount.get(a.id) ?? [];
    for (const p of ps) allPosts.push(p);
  }
  const topPosts = [...allPosts].sort((a, b) => b.views - a.views).slice(0, 5);
  const accountByHandle = new Map<string, AccountView>();
  for (const a of scopedAccounts) accountByHandle.set(a.id, a);

  return (
    <>
      <section className="mb-5 rounded-md border border-line bg-surface px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="t-micro text-ink-3">Average health</div>
            <div
              data-numeric
              className="mt-1 text-ink"
              style={{
                fontFamily: "var(--font-unbounded)",
                fontWeight: 800,
                fontSize: 28,
              }}
            >
              {covered > 0 ? avgHealth : "—"}
            </div>
          </div>
          {covered > 0 && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 ${BAND_BG[avgBand]}`}
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {BAND_LABEL[avgBand]}
            </span>
          )}
        </div>
        <p className="mt-1 t-meta text-ink-3" style={{ fontSize: 10 }}>
          {covered} of {scopedAccounts.length} accounts scored
        </p>
      </section>

      <section className="mb-5">
        <h3 className="t-micro mb-2 px-1 text-ink-3">Top accounts</h3>
        <ul className="flex flex-col gap-2">
          {ranked.map(({ account, health }) => (
            <li key={account.id}>
              <Link
                href={`/accounts/${account.id}`}
                className="tap-row flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${paletteBg(account.category?.palette_id)}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate t-body font-semibold text-ink">
                    {account.handle}
                  </span>
                  <span
                    className="block t-meta text-ink-3"
                    style={{ fontSize: 10 }}
                  >
                    {health.postCount > 0
                      ? `${compactNumber(health.totalViews)} views · ${health.postCount} posts (30d)`
                      : "No posts yet"}
                  </span>
                </span>
                <span
                  data-numeric
                  className="t-h2 text-ink"
                  style={{ minWidth: 36, textAlign: "right" }}
                >
                  {health.postCount > 0 ? health.healthScore : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="t-micro mb-2 px-1 text-ink-3">Top posts</h3>
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
              const a = accountByHandle.get(post.account_id);
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
                      {a && (
                        <span className="text-ink-2">{a.handle}</span>
                      )}
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
    </>
  );
}

function HistoryTab({
  loading,
  rows,
  onOpenManage,
}: {
  loading: boolean;
  rows: ReportHistoryRow[];
  onOpenManage: () => void;
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
          History appears here once the cron runs on the next scheduled day,
          or after a manual run from Manage → Generate now.
        </p>
        <button
          type="button"
          onClick={onOpenManage}
          className="tap-btn mt-3 inline-flex items-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 py-1.5 t-small font-medium text-ink hover:bg-surface-3"
        >
          Open manage
        </button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((h) => {
        const delivered = h.status === "delivered";
        return (
          <li
            key={h.id}
            className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3"
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
  onOpenManage: () => void;
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
      <div className="border-t border-line px-3 py-3">
        <button
          type="button"
          onClick={onOpenManage}
          className="tap-btn flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          Edit in Manage
        </button>
      </div>
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <div className="t-micro text-ink-3">{label}</div>
      <div
        data-numeric
        className="mt-1 text-ink"
        style={{
          fontFamily: "var(--font-unbounded)",
          fontWeight: 800,
          fontSize: 18,
        }}
      >
        {value}
      </div>
    </div>
  );
}
