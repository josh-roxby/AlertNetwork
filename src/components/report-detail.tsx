"use client";

import { useMemo, useState } from "react";
import { TabNav } from "@/components/tab-nav";
import { StatsGrid, type Stat } from "@/components/stats-grid";
import { AccountRow } from "@/components/account-row";
import { Star } from "@/components/featured-reports";
import { ScopeControl } from "@/components/scope-control";
import {
  adaptPlaceholderToView,
  placeholderAccounts,
  type Account,
  type Category,
  type Report,
  type ReportHistoryEntry,
} from "@/lib/placeholder-data";
import { compactNumber, relativeDate } from "@/lib/format";

type Tab = "recent" | "history" | "settings";

const CADENCE_LABEL: Record<Report["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

const STATUS_STYLE: Record<
  Report["status"],
  { wrap: string; dot: string; label: string }
> = {
  live: { wrap: "bg-good-soft text-good", dot: "bg-good pulse-dot", label: "Live" },
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

const DELIVERY_STYLE: Record<
  ReportHistoryEntry["status"],
  { wrap: string; dot: string; label: string }
> = {
  delivered: {
    wrap: "bg-good-soft text-good",
    dot: "bg-good",
    label: "Delivered",
  },
  failed: {
    wrap: "bg-bad-soft text-bad",
    dot: "bg-bad",
    label: "Failed",
  },
};

export function ReportDetail({
  report,
  accounts,
}: {
  report: Report;
  accounts: Account[];
}) {
  const [tab, setTab] = useState<Tab>("recent");

  return (
    <>
      <ReportTitleBlock report={report} />

      <div className="mb-4">
        <TabNav<Tab>
          tabs={[
            { id: "recent", label: "Recent" },
            { id: "history", label: "History" },
            { id: "settings", label: "Settings" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "recent" && <RecentTab report={report} accounts={accounts} />}
      {tab === "history" && <HistoryTab report={report} />}
      {tab === "settings" && <SettingsTab report={report} />}
    </>
  );
}

function ReportTitleBlock({ report }: { report: Report }) {
  const s = STATUS_STYLE[report.status];
  return (
    <section className="mb-4">
      <h1 className="t-display-1 uppercase text-ink">{report.name}</h1>
      <p className="mt-1 t-small text-ink-3">{report.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
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
        <span className="t-meta text-ink-3" style={{ fontSize: 10 }}>
          {CADENCE_LABEL[report.cadence]}
        </span>
        <span aria-hidden className="text-ink-4 text-[10px]">·</span>
        <span
          data-numeric
          className="text-ink-3"
          style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        >
          {report.recipients} recipients
        </span>
        <span aria-hidden className="text-ink-4 text-[10px]">·</span>
        <span
          data-numeric
          className="text-ink-3"
          style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
        >
          {report.accountIds.length} accounts
        </span>
      </div>
    </section>
  );
}

function RecentTab({
  report,
  accounts,
}: {
  report: Report;
  accounts: Account[];
}) {
  const lastHistory = report.history[0];
  const top = useMemo(
    () =>
      [...accounts].sort((a, b) => b.healthScore - a.healthScore).slice(0, 4),
    [accounts],
  );
  const movers = useMemo(
    () =>
      [...accounts]
        .filter((a) => Math.abs(a.trendDelta) >= 8)
        .sort((a, b) => Math.abs(b.trendDelta) - Math.abs(a.trendDelta))
        .slice(0, 4),
    [accounts],
  );

  const avgHealth = accounts.length
    ? Math.round(
        accounts.reduce((s, a) => s + a.healthScore, 0) / accounts.length,
      )
    : 0;
  const topScore = accounts.reduce(
    (max, a) => (a.healthScore > max ? a.healthScore : max),
    0,
  );
  const reach = accounts.reduce((s, a) => s + a.followers, 0);

  if (!lastHistory && !report.lastSentAt) {
    return (
      <section className="rounded-md border border-line bg-surface p-6 text-center">
        <p className="t-body text-ink-2">No sends yet.</p>
        <p className="mt-1 t-small text-ink-3">
          Trigger a send manually or wait for the next scheduled run.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mb-4 rounded-md border border-line bg-surface p-4">
        <div className="t-micro text-ink-3">
          {lastHistory ? formatDateLong(lastHistory.sentAt) : "Latest"}
        </div>
        <h2
          className="mt-1 t-display-3 text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          {report.name}
        </h2>
        <div
          data-numeric
          className="mt-2 flex flex-wrap items-center gap-1.5 text-ink-3"
          style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        >
          <span>{report.recipients} recipients</span>
          <span className="text-ink-4">·</span>
          <span>{accounts.length} accounts</span>
          <span className="text-ink-4">·</span>
          {lastHistory ? (
            <span className={DELIVERY_STYLE[lastHistory.status].wrap.includes("good") ? "text-good" : "text-bad"}>
              {DELIVERY_STYLE[lastHistory.status].label}
            </span>
          ) : (
            <span className="text-ink-3">Pending</span>
          )}
        </div>
      </section>

      <section className="mb-5">
        <StatsGrid
          stats={[
            { label: "Avg health", value: avgHealth.toString() },
            {
              label: "Movers",
              value: movers.length.toString(),
              trend: { kind: "neutral", label: "≥8%" },
            },
            { label: "Top score", value: topScore.toString() },
            { label: "Reach", value: compactNumber(reach) } satisfies Stat,
          ]}
        />
      </section>

      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="t-micro text-ink-3">Top performers</span>
          <span data-numeric className="t-small text-ink-3">
            {top.length}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {top.map((a) => (
            <li key={a.id}>
              <AccountRow account={adaptPlaceholderToView(a)} />
            </li>
          ))}
        </ul>
      </section>

      {movers.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="t-micro text-ink-3">Notable movers</span>
            <span data-numeric className="t-small text-ink-3">
              {movers.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {movers.map((a) => (
              <li key={a.id}>
                <AccountRow account={adaptPlaceholderToView(a)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ByCategorySection accounts={accounts} />

      <section className="flex flex-col gap-2">
        <button
          type="button"
          className="tap-btn rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          Resend to recipients
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-3 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Export PDF
        </button>
      </section>
    </>
  );
}

function HistoryTab({ report }: { report: Report }) {
  if (report.history.length === 0) {
    return (
      <section className="rounded-md border border-line bg-surface p-6 text-center">
        <p className="t-body text-ink-2">No history yet.</p>
        <p className="mt-1 t-small text-ink-3">
          Past sends will appear here once this report has run.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between px-1">
        <span data-numeric className="t-small text-ink-2">
          {report.history.length} past sends
        </span>
        <button
          type="button"
          className="tap-btn t-micro text-ink-3 hover:text-ink"
        >
          Sort · Newest first
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {report.history.map((h) => (
          <li key={h.id}>
            <HistoryItem reportId={report.id} entry={h} />
          </li>
        ))}
      </ul>
    </>
  );
}

function HistoryItem({
  reportId,
  entry,
}: {
  reportId: string;
  entry: ReportHistoryEntry;
}) {
  const s = DELIVERY_STYLE[entry.status];
  return (
    <a
      href={`/reports/${reportId}/view?historyId=${entry.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="tap-row flex w-full flex-col gap-1 rounded-md border border-line bg-surface px-3.5 py-3 text-left transition-colors duration-[120ms] hover:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="t-body font-semibold text-ink">
          {formatDateShort(entry.sentAt)}
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 ${s.wrap}`}
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
          />
          {s.label}
        </span>
      </div>
      <div
        data-numeric
        className="flex items-center justify-between text-ink-3"
        style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
      >
        <span>
          {entry.recipients} recipients · {entry.accounts} accounts
        </span>
        <span>{relativeDate(entry.sentAt)}</span>
      </div>
    </a>
  );
}

function SettingsTab({ report }: { report: Report }) {
  const cadenceOptions: Report["cadence"][] = ["weekly", "monthly"];
  const [featured, setFeatured] = useState(report.isFeatured);
  const [scope, setScope] = useState<Report["scopeKind"]>(report.scopeKind);
  const [passwordOn, setPasswordOn] = useState(report.password !== null);
  const [passwordValue, setPasswordValue] = useState(report.password ?? "");
  const [pickedCategories, setPickedCategories] = useState<Set<Category>>(
    () => new Set<Category>(),
  );
  const [pickedAccounts, setPickedAccounts] = useState<Set<string>>(
    () => new Set(report.accountIds),
  );

  function toggleCategory(c: Category) {
    const next = new Set(pickedCategories);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setPickedCategories(next);
  }
  function toggleAccount(id: string) {
    const next = new Set(pickedAccounts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPickedAccounts(next);
  }

  return (
    <>
      <FeatureToggle
        on={featured}
        onToggle={() => setFeatured((v) => !v)}
      />

      <PasswordToggle
        on={passwordOn}
        value={passwordValue}
        onToggle={() => setPasswordOn((v) => !v)}
        onChange={setPasswordValue}
      />

      <Field label="Name" defaultValue={report.name} />
      <Field
        label="Description"
        defaultValue={report.description}
        multiline
      />

      <Segmented
        label="Cadence"
        options={cadenceOptions.map(
          (c) => ({ id: c, label: CADENCE_LABEL[c] }),
        )}
        active={report.cadence}
      />

      <Field label="Send on" defaultValue={report.schedule} />

      <div className="mb-4">
        <div className="t-micro mb-1.5 text-ink-3">Recipients</div>
        <ul className="flex flex-col gap-1">
          {report.recipientEmails.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between gap-2 rounded-sm border border-line-2 bg-surface-2 px-3 py-2"
            >
              <span className="t-body truncate text-ink">{email}</span>
              <button
                type="button"
                aria-label={`Remove ${email}`}
                className="tap-btn t-meta shrink-0 text-ink-3 hover:text-ink"
                style={{ fontSize: 10 }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input
            disabled
            type="email"
            placeholder="add@example.com"
            className="h-10 flex-1 rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 disabled:opacity-70"
          />
          <button
            type="button"
            disabled
            className="tap-btn rounded-sm border border-line-2 bg-surface px-3 t-body font-medium text-ink-2 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <ScopeControl
        scope={scope}
        pickedCategories={pickedCategories}
        pickedAccounts={pickedAccounts}
        onScopeChange={setScope}
        onToggleCategory={toggleCategory}
        onToggleAccount={toggleAccount}
        totalAccounts={placeholderAccounts.length}
      />

      <p className="mt-2 rounded-sm border border-accent-line bg-accent-soft px-3 py-2 t-small text-accent">
        Preview only. Save / pause / send-test become live once the API and
        auth layers are wired up.
      </p>

      <section className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="tap-btn rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          Save changes
        </button>
        <button
          type="button"
          className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-3 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Send test to me
        </button>
        <button
          type="button"
          className="tap-btn rounded-sm border border-bad/40 bg-bad-soft px-4 py-3 t-body font-medium text-bad hover:bg-bad-soft hover:opacity-90"
        >
          {report.status === "live" ? "Pause report" : "Resume report"}
        </button>
      </section>
    </>
  );
}

function FeatureToggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`tap-row mb-5 flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors duration-[120ms] ${
        on
          ? "border-accent-line bg-accent-soft"
          : "border-line-2 bg-surface hover:bg-surface-2"
      }`}
    >
      <span
        aria-hidden
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${
          on ? "bg-accent text-[#0A0A0A]" : "bg-surface-2 text-ink-3"
        }`}
      >
        <Star filled={on} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block t-body font-semibold ${on ? "text-accent" : "text-ink"}`}>
          {on ? "Featured on dashboard" : "Feature on dashboard"}
        </span>
        <span className="mt-0.5 block t-small text-ink-3">
          {on
            ? "This report appears in the dashboard featured section."
            : "Show this report in the dashboard featured section."}
        </span>
      </span>
      <span
        aria-hidden
        className={`relative inline-block h-6 w-10 shrink-0 rounded-full transition-colors duration-[120ms] ${
          on ? "bg-accent" : "bg-surface-3"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0A0A0A] transition-transform duration-[120ms] ${
            on ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function PasswordToggle({
  on,
  value,
  onToggle,
  onChange,
}: {
  on: boolean;
  value: string;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={`mb-5 rounded-md border transition-colors duration-[120ms] ${
        on ? "border-accent-line bg-accent-soft" : "border-line-2 bg-surface"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        className="tap-row flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          aria-hidden
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${
            on ? "bg-accent text-[#0A0A0A]" : "bg-surface-2 text-ink-3"
          }`}
        >
          <LockIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block t-body font-semibold ${on ? "text-accent" : "text-ink"}`}
          >
            {on ? "Password protected" : "Require password to view"}
          </span>
          <span className="mt-0.5 block t-small text-ink-3">
            {on
              ? "Recipients must enter the password to open the shareable view."
              : "Add a password to gate the shareable view-only link."}
          </span>
        </span>
        <span
          aria-hidden
          className={`relative inline-block h-6 w-10 shrink-0 rounded-full transition-colors duration-[120ms] ${
            on ? "bg-accent" : "bg-surface-3"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0A0A0A] transition-transform duration-[120ms] ${
              on ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </span>
      </button>
      {on && (
        <div className="border-t border-line-2 px-4 py-3">
          <label className="block">
            <span className="t-micro mb-1.5 block text-ink-3">Password</span>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. clientx-2026"
              className="h-10 w-full rounded-sm border border-line-2 bg-bg px-3 t-body text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
            />
          </label>
          <p className="mt-1.5 t-small text-ink-3">
            Anyone with the view link must enter this exact password. Share it
            out-of-band — don&apos;t paste it next to the link.
          </p>
        </div>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

function Field({
  label,
  defaultValue,
  multiline = false,
}: {
  label: string;
  defaultValue?: string;
  multiline?: boolean;
}) {
  return (
    <label className="mb-4 block">
      <span className="t-micro mb-1.5 block text-ink-3">{label}</span>
      {multiline ? (
        <textarea
          disabled
          defaultValue={defaultValue}
          rows={3}
          className="w-full resize-none rounded-sm border border-line-2 bg-surface-2 px-3 py-2 t-body text-ink placeholder:text-ink-3 disabled:opacity-90"
        />
      ) : (
        <input
          disabled
          defaultValue={defaultValue}
          className="h-10 w-full rounded-sm border border-line-2 bg-surface-2 px-3 t-body text-ink placeholder:text-ink-3 disabled:opacity-90"
        />
      )}
    </label>
  );
}

function Segmented<T extends string>({
  label,
  options,
  active,
}: {
  label: string;
  options: { id: T; label: string }[];
  active: T;
}) {
  return (
    <div className="mb-4">
      <span className="t-micro mb-1.5 block text-ink-3">{label}</span>
      <div
        className="grid gap-1 rounded-sm border border-line-2 bg-surface-2 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled
            className={`tap-btn rounded-xs px-2 py-1.5 t-small font-medium transition-colors duration-[120ms] disabled:cursor-not-allowed ${
              o.id === active
                ? "bg-bg text-ink"
                : "text-ink-2"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDateLong(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    })
    .toUpperCase();
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

// -----------------------------------------------------------------------------
// By-category section (Recent tab) — groups accounts in the report by their
// category, shows per-group stats, lists the accounts.

const CATEGORY_LABEL: Record<Category, string> = {
  fashion: "Fashion",
  food: "Food",
  beauty: "Beauty",
  tech: "Tech",
  sports: "Sports",
  music: "Music",
  travel: "Travel",
  lifestyle: "Lifestyle",
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

function ByCategorySection({ accounts }: { accounts: Account[] }) {
  const groups = useMemo(() => {
    const buckets = new Map<Category, Account[]>();
    for (const a of accounts) {
      const arr = buckets.get(a.category) ?? [];
      arr.push(a);
      buckets.set(a.category, arr);
    }
    return Array.from(buckets.entries())
      .map(([category, items]) => ({
        category,
        items: items.sort((x, y) => y.healthScore - x.healthScore),
        avgHealth: Math.round(
          items.reduce((s, x) => s + x.healthScore, 0) / items.length,
        ),
        topScore: items.reduce(
          (m, x) => (x.healthScore > m ? x.healthScore : m),
          0,
        ),
        reach: items.reduce((s, x) => s + x.followers, 0),
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [accounts]);

  if (groups.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="t-micro text-ink-3">By category</span>
        <span data-numeric className="t-small text-ink-3">
          {groups.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <article
            key={g.category}
            className="overflow-hidden rounded-md border border-line bg-surface"
          >
            <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_COLOR[g.category]}`}
                />
                <span className="t-body font-semibold text-ink">
                  {CATEGORY_LABEL[g.category]}
                </span>
                <span
                  data-numeric
                  className="text-ink-3"
                  style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                >
                  {g.items.length}
                </span>
              </span>
              <span
                data-numeric
                className="flex items-center gap-2 text-ink-3"
                style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              >
                <span>Avg {g.avgHealth}</span>
                <span className="text-ink-4">·</span>
                <span>Top {g.topScore}</span>
                <span className="text-ink-4">·</span>
                <span>{compactNumber(g.reach)}</span>
              </span>
            </header>
            <ul className="flex flex-col">
              {g.items.map((a) => (
                <li key={a.id} className="border-b border-line last:border-b-0">
                  <AccountRow account={adaptPlaceholderToView(a)} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

