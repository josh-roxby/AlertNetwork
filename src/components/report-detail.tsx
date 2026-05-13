"use client";

import { useMemo, useState } from "react";
import { TabNav } from "@/components/tab-nav";
import { StatsGrid, type Stat } from "@/components/stats-grid";
import { AccountRow } from "@/components/account-row";
import {
  type Account,
  type Report,
  type ReportHistoryEntry,
} from "@/lib/placeholder-data";
import { compactNumber, relativeDate } from "@/lib/format";

type Tab = "recent" | "history" | "settings";

const CADENCE_LABEL: Record<Report["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  "one-off": "One-off",
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
    label: "One-off",
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
              <AccountRow account={a} />
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
                <AccountRow account={a} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <button
          type="button"
          className="tap-btn rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          Resend to recipients
        </button>
        <button
          type="button"
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
            <HistoryItem entry={h} />
          </li>
        ))}
      </ul>
    </>
  );
}

function HistoryItem({ entry }: { entry: ReportHistoryEntry }) {
  const s = DELIVERY_STYLE[entry.status];
  return (
    <button
      type="button"
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
    </button>
  );
}

function SettingsTab({ report }: { report: Report }) {
  const cadenceOptions: Report["cadence"][] = ["one-off", "weekly", "monthly"];
  const scopeOptions: Report["scopeKind"][] = ["project", "tag", "account"];

  return (
    <>
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

      <Segmented
        label="Scope"
        options={scopeOptions.map((k) => ({
          id: k,
          label:
            k === "project"
              ? "By project"
              : k === "tag"
                ? "By tag"
                : "Specific",
        }))}
        active={report.scopeKind}
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
