"use client";

import { AccountRow } from "@/components/account-row";
import {
  CATEGORIES,
  type Account,
  type Category,
  type Report,
  type ReportHistoryEntry,
} from "@/lib/placeholder-data";
import { compactNumber, percent } from "@/lib/format";

const CADENCE_LABEL: Record<Report["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

const SCOPE_LABEL: Record<Report["scopeKind"], string> = {
  project: "Whole project",
  tag: "By category",
  account: "Specific accounts",
};

const CATEGORY_COLOR: Record<Category, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

const CATEGORY_LABEL: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
) as Record<Category, string>;

const ukDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ReportView({
  report,
  accounts,
  historyEntry,
}: {
  report: Report;
  accounts: Account[];
  historyEntry?: ReportHistoryEntry;
}) {
  const avgHealth = accounts.length
    ? Math.round(
        accounts.reduce((s, a) => s + a.healthScore, 0) / accounts.length,
      )
    : 0;
  const topScore = accounts.reduce(
    (m, a) => (a.healthScore > m ? a.healthScore : m),
    0,
  );
  const avgEngagement = accounts.length
    ? accounts.reduce((s, a) => s + a.engagementRatio, 0) / accounts.length
    : 0;
  const movers = accounts.filter((a) => Math.abs(a.trendDelta) >= 8);
  const top = [...accounts]
    .sort((a, b) => b.healthScore - a.healthScore)
    .slice(0, 4);
  const reach = accounts.reduce((s, a) => s + a.followers, 0);

  const groups = groupByCategory(accounts);

  const sentAt = historyEntry?.sentAt ?? report.lastSentAt;
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
          historyEntry={historyEntry}
        />

        <section className="mb-8">
          <p className="t-body text-ink-2">{report.description}</p>
        </section>

        <Section title="Overview">
          <OverviewTable
            rows={[
              { label: "Cadence", value: CADENCE_LABEL[report.cadence] },
              { label: "Schedule", value: report.schedule || "—" },
              { label: "Scope", value: SCOPE_LABEL[report.scopeKind] },
              { label: "Recipients", value: String(report.recipients) },
              { label: "Accounts", value: String(accounts.length) },
              { label: "Avg health", value: String(avgHealth) },
              { label: "Top score", value: String(topScore) },
              { label: "Movers (≥8%)", value: String(movers.length) },
              { label: "Avg engagement", value: percent(avgEngagement, 2) },
              { label: "Combined reach", value: compactNumber(reach) },
            ]}
          />
        </Section>

        {top.length > 0 && (
          <Section title="Top performers">
            <ul className="flex flex-col gap-2">
              {top.map((a) => (
                <li key={a.id}>
                  <AccountRow account={a} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {movers.length > 0 && (
          <Section title="Notable movers">
            <ul className="flex flex-col gap-2">
              {movers.map((a) => (
                <li key={a.id}>
                  <AccountRow account={a} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {groups.length > 1 && (
          <Section title="By category">
            <div className="flex flex-col gap-6">
              {groups.map((g) => (
                <article key={g.category}>
                  <header className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_COLOR[g.category]}`}
                      />
                      <span className="t-h2 text-ink">
                        {CATEGORY_LABEL[g.category]}
                      </span>
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
                      Avg {g.avgHealth} · {compactNumber(g.reach)} reach
                    </span>
                  </header>
                  <ul className="flex flex-col gap-2">
                    {g.items.map((a) => (
                      <li key={a.id}>
                        <AccountRow account={a} />
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
  historyEntry,
}: {
  reportName: string;
  sentLabel: string;
  exportedLabel: string;
  historyEntry?: ReportHistoryEntry;
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
        {historyEntry && (
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

type Group = {
  category: Category;
  items: Account[];
  avgHealth: number;
  reach: number;
};

function groupByCategory(accounts: Account[]): Group[] {
  const buckets = new Map<Category, Account[]>();
  for (const a of accounts) {
    const arr = buckets.get(a.category) ?? [];
    arr.push(a);
    buckets.set(a.category, arr);
  }
  return Array.from(buckets.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => b.healthScore - a.healthScore),
      avgHealth: Math.round(
        items.reduce((s, x) => s + x.healthScore, 0) / items.length,
      ),
      reach: items.reduce((s, x) => s + x.followers, 0),
    }))
    .sort((a, b) => b.items.length - a.items.length);
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
