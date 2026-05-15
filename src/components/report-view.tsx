"use client";

import { compactNumber, percent } from "@/lib/format";
import { paletteBg } from "@/lib/data/palette";
import {
  averageHealth,
  BAND_BG,
  type AccountHealth,
} from "@/lib/data/health";
import type {
  AccountView,
  PostRow,
  ReportRow,
} from "@/lib/data/types";

const CADENCE_LABEL: Record<ReportRow["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

const SCOPE_LABEL: Record<ReportRow["scope_kind"], string> = {
  project: "Whole project",
  category: "By category",
  account: "Specific accounts",
};

const ukDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export type EnrichedAccount = {
  account: AccountView;
  health: AccountHealth;
};

export function ReportView({
  report,
  enriched,
  postsByAccount,
  historySentAt,
}: {
  report: ReportRow;
  enriched: EnrichedAccount[];
  postsByAccount: Map<string, PostRow[]>;
  historySentAt: string | null;
}) {
  const accounts = enriched.map((e) => e.account);
  const accountIds = accounts.map((a) => a.id);
  const avg = averageHealth(postsByAccount, accountIds);
  const topScore = enriched.reduce(
    (m, e) => (e.health.healthScore > m ? e.health.healthScore : m),
    0,
  );
  const totalViews = enriched.reduce((s, e) => s + e.health.totalViews, 0);
  const totalEng = enriched.reduce((s, e) => s + e.health.totalEngagements, 0);
  const avgEngagement = totalViews > 0 ? totalEng / totalViews : 0;
  const movers = enriched.filter(
    (e) => Math.abs(e.health.trendDelta) >= 8 && e.health.postCount > 0,
  );
  const top = [...enriched]
    .filter((e) => e.health.postCount > 0)
    .sort((a, b) => b.health.healthScore - a.health.healthScore)
    .slice(0, 4);

  const groups = groupByCategory(enriched);
  const topPosts = collectTopPosts(postsByAccount, accountIds, 5);

  const sentAt = historySentAt ?? report.last_sent_at;
  const sentLabel = sentAt ? ukDate.format(new Date(sentAt)) : "—";
  const exportedLabel = ukDate.format(new Date());

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div
        className="mx-auto w-full max-w-[720px] px-6 py-10"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <DocumentHeader
          reportName={report.name}
          sentLabel={sentLabel}
          exportedLabel={exportedLabel}
          isHistory={!!historySentAt}
        />

        {report.description && (
          <section className="mb-8">
            <p className="t-body text-ink-2">{report.description}</p>
          </section>
        )}

        <Section title="Overview">
          <OverviewTable
            rows={[
              { label: "Cadence", value: CADENCE_LABEL[report.cadence] },
              { label: "Schedule", value: report.schedule || "—" },
              { label: "Scope", value: SCOPE_LABEL[report.scope_kind] },
              { label: "Accounts", value: String(accounts.length) },
              {
                label: "Avg health",
                value: avg.covered > 0 ? String(avg.avgHealth) : "—",
              },
              {
                label: "Top score",
                value: topScore > 0 ? String(topScore) : "—",
              },
              {
                label: "Movers (≥8%)",
                value: String(movers.length),
              },
              {
                label: "Avg engagement",
                value: avgEngagement > 0 ? percent(avgEngagement, 2) : "—",
              },
              {
                label: "Total views (30d)",
                value: totalViews > 0 ? compactNumber(totalViews) : "—",
              },
            ]}
          />
        </Section>

        {top.length > 0 && (
          <Section title="Top performers">
            <ul className="flex flex-col gap-2">
              {top.map((e) => (
                <li key={e.account.id}>
                  <AccountLine account={e.account} health={e.health} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {topPosts.length > 0 && (
          <Section title="Top posts">
            <ul className="flex flex-col gap-2">
              {topPosts.map((post) => {
                const a = accounts.find((x) => x.id === post.account_id);
                return (
                  <li key={post.id}>
                    <PostLine post={post} handle={a?.handle} />
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {movers.length > 0 && (
          <Section title="Notable movers">
            <ul className="flex flex-col gap-2">
              {movers.map((e) => (
                <li key={e.account.id}>
                  <AccountLine account={e.account} health={e.health} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {groups.length > 1 && (
          <Section title="By category">
            <div className="flex flex-col gap-6">
              {groups.map((g) => (
                <article key={g.id}>
                  <header className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`inline-block h-2.5 w-2.5 rounded-full ${paletteBg(g.paletteId)}`}
                      />
                      <span className="t-h2 text-ink">{g.label}</span>
                      <span
                        data-numeric
                        className="text-ink-3"
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {g.items.length}
                      </span>
                    </span>
                    <span
                      data-numeric
                      className="text-ink-3"
                      style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                    >
                      Avg {g.avgHealth} · {compactNumber(g.reach)} views
                    </span>
                  </header>
                  <ul className="flex flex-col gap-2">
                    {g.items.map((e) => (
                      <li key={e.account.id}>
                        <AccountLine account={e.account} health={e.health} />
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Section>
        )}

        <footer
          className="mt-10 border-t border-line pt-4 t-meta text-ink-3"
          style={{ fontSize: 10 }}
        >
          Generated by Alert Network · Exported {exportedLabel}
        </footer>

        <div className="mt-6 flex items-center justify-center" data-print="hide">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="tap-btn inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-4 py-2 t-small font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
            title="Save as PDF via your browser"
          >
            <PrintGlyph />
            Print or save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentHeader({
  reportName,
  sentLabel,
  exportedLabel,
  isHistory,
}: {
  reportName: string;
  sentLabel: string;
  exportedLabel: string;
  isHistory: boolean;
}) {
  return (
    <header className="mb-8 border-b border-line pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[#0A0A0A]"
            style={{
              fontFamily: "var(--font-unbounded)",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            A
          </span>
          <span
            className="t-meta text-ink-3"
            style={{ fontSize: 10, letterSpacing: "0.2em" }}
          >
            Alert Network · Report
          </span>
        </div>
        {isHistory && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-ink-2"
            style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          >
            Historic snapshot
          </span>
        )}
      </div>
      <h1
        className="mt-5 t-display-2 text-ink"
        style={{ fontFamily: "var(--font-unbounded)" }}
      >
        {reportName}
      </h1>
      <dl
        className="mt-4 grid grid-cols-2 gap-y-2 text-ink-3"
        style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
      >
        <div>
          <dt className="t-meta text-ink-4" style={{ fontSize: 10 }}>
            Report date
          </dt>
          <dd data-numeric className="mt-0.5 text-ink-2">
            {sentLabel}
          </dd>
        </div>
        <div className="text-right">
          <dt className="t-meta text-ink-4" style={{ fontSize: 10 }}>
            Exported
          </dt>
          <dd data-numeric className="mt-0.5 text-ink-2">
            {exportedLabel}
          </dd>
        </div>
      </dl>
    </header>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2
        className="t-meta mb-3 text-ink-3"
        style={{ fontSize: 10, letterSpacing: "0.16em" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function OverviewTable({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={r.label}
            className={i === rows.length - 1 ? "" : "border-b border-line"}
          >
            <th
              scope="row"
              className="py-2 pr-3 text-left text-ink-3"
              style={{
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "var(--font-mono)",
                width: "55%",
              }}
            >
              {r.label}
            </th>
            <td
              data-numeric
              className="py-2 text-right text-ink"
              style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
            >
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AccountLine({
  account,
  health,
}: {
  account: AccountView;
  health: AccountHealth;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5">
      <span
        aria-hidden
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${paletteBg(account.category?.palette_id)}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block t-body truncate font-semibold text-ink">
          {account.handle}
        </span>
        <span
          data-numeric
          className="block t-meta text-ink-3"
          style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        >
          {health.postCount > 0
            ? `${compactNumber(health.totalViews)} views · ${percent(health.engagementRate, 1)} ER · ${health.postCount} posts`
            : "No posts yet"}
        </span>
      </span>
      <span
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${BAND_BG[health.band]}`}
        style={{ fontSize: 10, fontWeight: 600 }}
      >
        {health.postCount > 0 ? health.healthScore : "—"}
      </span>
    </div>
  );
}

function PostLine({ post, handle }: { post: PostRow; handle?: string }) {
  const inner = (
    <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-3 py-2.5">
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
          style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        >
          {handle && <span className="text-ink-2">{handle}</span>}
          <span>{compactNumber(post.views)} views</span>
          <span>{compactNumber(post.likes)} likes</span>
          <span>{compactNumber(post.comments)} comments</span>
        </span>
      </span>
    </div>
  );
  return post.url ? (
    <a href={post.url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

type Group = {
  id: string;
  label: string;
  paletteId: string | null;
  items: EnrichedAccount[];
  avgHealth: number;
  reach: number;
};

function groupByCategory(enriched: EnrichedAccount[]): Group[] {
  const buckets = new Map<string, Group>();
  for (const e of enriched) {
    const cat = e.account.category;
    const key = cat?.id ?? "__none";
    let g = buckets.get(key);
    if (!g) {
      g = {
        id: key,
        label: cat?.label ?? "Uncategorised",
        paletteId: cat?.palette_id ?? null,
        items: [],
        avgHealth: 0,
        reach: 0,
      };
      buckets.set(key, g);
    }
    g.items.push(e);
  }
  for (const g of buckets.values()) {
    g.items.sort((a, b) => b.health.healthScore - a.health.healthScore);
    const scored = g.items.filter((e) => e.health.postCount > 0);
    g.avgHealth =
      scored.length > 0
        ? Math.round(
            scored.reduce((s, e) => s + e.health.healthScore, 0) /
              scored.length,
          )
        : 0;
    g.reach = g.items.reduce((s, e) => s + e.health.totalViews, 0);
  }
  return Array.from(buckets.values()).sort(
    (a, b) => b.items.length - a.items.length,
  );
}

function collectTopPosts(
  postsByAccount: Map<string, PostRow[]>,
  accountIds: string[],
  limit: number,
): PostRow[] {
  const all: PostRow[] = [];
  for (const id of accountIds) {
    const ps = postsByAccount.get(id);
    if (ps) for (const p of ps) all.push(p);
  }
  return all.sort((a, b) => b.views - a.views).slice(0, limit);
}

function PrintGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 5V2h8v3" />
      <rect x="2" y="5" width="10" height="6" rx="1" />
      <path d="M4 9h6v3H4z" />
    </svg>
  );
}
