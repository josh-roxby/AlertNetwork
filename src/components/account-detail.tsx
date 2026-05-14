"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type Account,
  type AccountSeriesPoint,
} from "@/lib/placeholder-data";
import { compactNumber, percent } from "@/lib/format";
import { healthBand } from "@/components/health-score";
import { useShell } from "@/components/shell-context";

const CATEGORY_COLOR: Record<Account["category"], string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

const CATEGORY_LABEL: Record<Account["category"], string> = {
  fashion: "Fashion",
  food: "Food",
  beauty: "Beauty",
  tech: "Tech",
  sports: "Sports",
  music: "Music",
  travel: "Travel",
  lifestyle: "Lifestyle",
};

const BAND_LABEL = {
  excellent: "Excellent",
  strong: "Strong",
  watching: "Watching",
  weak: "Weak",
  critical: "Critical",
} as const;

type Range = "7d" | "30d" | "90d";
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function AccountDetail({
  account,
  series,
}: {
  account: Account;
  series: AccountSeriesPoint[];
}) {
  const [range, setRange] = useState<Range>("30d");
  const { openSheet } = useShell();

  const filtered = useMemo(
    () => series.slice(-RANGE_DAYS[range]),
    [series, range],
  );

  const first = filtered[0];
  const last = filtered[filtered.length - 1];

  return (
    <>
      <section className="mb-4 flex items-start gap-3">
        <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-2 ring-1 ring-line">
          <span
            className="text-ink"
            style={{
              fontFamily: "var(--font-unbounded)",
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            {account.handle.replace(/^@/, "").charAt(0).toUpperCase()}
          </span>
          <span
            aria-hidden
            className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-bg ${CATEGORY_COLOR[account.category]}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="t-display-3 uppercase text-ink">
            {account.displayName}
          </h1>
          <div className="mt-0.5 t-body text-ink-3">{account.handle}</div>
        </div>
        <button
          type="button"
          onClick={() =>
            openSheet({ kind: "editAccount", accountId: account.id })
          }
          className="tap-btn inline-flex shrink-0 items-center gap-1 rounded-full border border-line-2 bg-surface px-3 py-1.5 t-small font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Edit
        </button>
      </section>

      <section className="mb-4 flex flex-wrap items-center gap-1.5">
        <Chip>
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${CATEGORY_COLOR[account.category]}`}
          />
          {CATEGORY_LABEL[account.category]}
        </Chip>
        <Chip>{BAND_LABEL[healthBand(account.healthScore)]}</Chip>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-2">
        <StatCell
          label="Followers"
          value={compactNumber(account.followers)}
        />
        <StatCell
          label="Health"
          value={account.healthScore.toString()}
        />
        <StatCell
          label="Median views"
          value={compactNumber(account.medianViews)}
        />
        <StatCell
          label="Engagement"
          value={percent(account.engagementRatio, 1)}
        />
      </section>

      <section className="mb-5">
        <a
          href={account.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-btn flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          View on platform
          <span aria-hidden>↗</span>
        </a>
      </section>

      <section className="mb-3">
        <div className="t-micro mb-2 text-ink-3">Tags</div>
        <ul className="flex flex-wrap gap-1.5">
          {account.tags.map((t) => (
            <li key={t}>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 px-2.5 py-1 text-ink-2"
                style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              >
                <span className="text-ink-3">#</span>
                {t}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="t-h1 text-ink">Trends</h2>
        <RangeSelector value={range} onChange={setRange} />
      </section>

      <div className="flex flex-col gap-3">
        <ChartCard
          label="Health score"
          deltaLabel={deltaLabel(first?.health, last?.health)}
          deltaPositive={(last?.health ?? 0) >= (first?.health ?? 0)}
          chart={
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={filtered} margin={chartMargin}>
                <defs>
                  <linearGradient id="health" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--ink)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis {...xAxis} />
                <YAxis {...yAxis} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip suffix="" />} />
                <Area
                  type="monotone"
                  dataKey="health"
                  stroke="var(--ink)"
                  strokeWidth={2}
                  fill="url(#health)"
                />
              </AreaChart>
            </ResponsiveContainer>
          }
        />

        <ChartCard
          label="Median views"
          deltaLabel={deltaLabel(first?.medianViews, last?.medianViews, true)}
          deltaPositive={(last?.medianViews ?? 0) >= (first?.medianViews ?? 0)}
          chart={
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={filtered} margin={chartMargin}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis {...xAxis} />
                <YAxis
                  {...yAxis}
                  tickFormatter={(v: number) => compactNumber(v)}
                  width={32}
                />
                <Tooltip content={<ChartTooltip formatter={compactNumber} />} />
                <Line
                  type="monotone"
                  dataKey="medianViews"
                  stroke="var(--info)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          }
        />

        <ChartCard
          label="Engagement"
          deltaLabel={deltaLabel(first?.engagement, last?.engagement, false, true)}
          deltaPositive={(last?.engagement ?? 0) >= (first?.engagement ?? 0)}
          chart={
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={filtered} margin={chartMargin}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis {...xAxis} />
                <YAxis
                  {...yAxis}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  width={36}
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
          label="Followers"
          deltaLabel={deltaLabel(first?.followers, last?.followers, true)}
          deltaPositive={(last?.followers ?? 0) >= (first?.followers ?? 0)}
          chart={
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={filtered} margin={chartMargin}>
                <defs>
                  <linearGradient id="followers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis {...xAxis} />
                <YAxis
                  {...yAxis}
                  tickFormatter={(v: number) => compactNumber(v)}
                  width={32}
                />
                <Tooltip content={<ChartTooltip formatter={compactNumber} />} />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#followers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          }
        />
      </div>
    </>
  );
}

const chartMargin = { top: 8, right: 0, bottom: 0, left: -12 };

const xAxis = {
  dataKey: "date" as const,
  tick: {
    fontSize: 10,
    fill: "var(--ink-3)",
    fontFamily: "var(--font-mono)",
  },
  tickFormatter: (d: string) => d.slice(5).replace("-", "/"),
  tickLine: false,
  axisLine: { stroke: "var(--line-2)" },
  minTickGap: 28,
};

const yAxis = {
  tick: {
    fontSize: 10,
    fill: "var(--ink-3)",
    fontFamily: "var(--font-mono)",
  },
  tickLine: false,
  axisLine: false as const,
  width: 28,
};

function deltaLabel(
  start: number | undefined,
  end: number | undefined,
  numeric = false,
  isRatio = false,
): string {
  if (start === undefined || end === undefined || start === 0) return "—";
  const diff = end - start;
  const pct = (diff / start) * 100;
  if (numeric) {
    const sign = diff >= 0 ? "+" : "−";
    return `${sign}${compactNumber(Math.abs(diff))}`;
  }
  if (isRatio) {
    const sign = diff >= 0 ? "+" : "−";
    return `${sign}${Math.abs(diff * 100).toFixed(2)}pp`;
  }
  return `${diff >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
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
          fontSize: 24,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-2.5 py-1 text-ink-2"
      style={{ fontSize: 11 }}
    >
      {children}
    </span>
  );
}

function RangeSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  const options: Range[] = ["7d", "30d", "90d"];
  return (
    <div className="inline-flex rounded-sm border border-line-2 bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`tap-btn rounded-xs px-2.5 py-1 t-small font-medium transition-colors duration-[120ms] ${
            o === value
              ? "bg-bg text-ink"
              : "text-ink-3 hover:text-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function ChartCard({
  label,
  deltaLabel,
  deltaPositive,
  chart,
}: {
  label: string;
  deltaLabel: string;
  deltaPositive: boolean;
  chart: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
        <span className="t-micro text-ink-3">{label}</span>
        <span
          data-numeric
          className={`text-[11px] font-semibold ${
            deltaLabel === "—"
              ? "text-ink-3"
              : deltaPositive
                ? "text-good"
                : "text-bad"
          }`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {deltaLabel}
        </span>
      </div>
      <div className="px-1 py-2">{chart}</div>
    </div>
  );
}

type TooltipPayload = {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  suffix = "",
}: TooltipPayload & {
  formatter?: (n: number) => string;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  const display = formatter ? formatter(value) : value.toString();
  return (
    <div
      className="rounded-sm border border-line-2 bg-surface px-2.5 py-1.5 shadow-[var(--sh-md)]"
      style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
    >
      <div className="text-ink">{display}{suffix}</div>
      <div className="text-ink-3" style={{ fontSize: 9 }}>
        {label}
      </div>
    </div>
  );
}
