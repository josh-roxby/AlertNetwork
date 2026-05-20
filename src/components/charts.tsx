// Shared Recharts primitives. Used by /accounts/[id] and /reports/[id]
// so the two surfaces look like sibling pages — same tick fonts, same
// axis style, same tooltip behaviour.
//
// Recharts wants its child components rendered inside a chart parent
// (`AreaChart`, `LineChart`, `BarChart`), so this module deliberately
// exports the *building blocks* — chart-margin defaults, axis props,
// tooltip body, and a `ChartCard` shell — rather than wrapping the
// chart components themselves. Callers compose them.

import * as React from "react";

export const CHART_MARGIN = { top: 8, right: 0, bottom: 0, left: -12 };

// Use these by spreading onto an XAxis / YAxis from recharts:
//   <XAxis {...X_AXIS} />
//   <YAxis {...Y_AXIS} width={36} tickFormatter={...} />
export const X_AXIS = {
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

export const Y_AXIS = {
  tick: {
    fontSize: 10,
    fill: "var(--ink-3)",
    fontFamily: "var(--font-mono)",
  },
  tickLine: false,
  axisLine: false as const,
};

// Card wrapper for a chart — top row carries the metric label + a
// summary value (e.g. "Daily views · 1.2M"), body is the chart.
export function ChartCard({
  label,
  value,
  valueLabel,
  chart,
}: {
  label: string;
  value: string;
  valueLabel: string;
  chart: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
        <span className="t-micro text-ink-3">{label}</span>
        <span className="flex items-baseline gap-1.5">
          <span
            data-numeric
            className="text-ink"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          >
            {value}
          </span>
          <span className="t-meta text-ink-4" style={{ fontSize: 9 }}>
            {valueLabel}
          </span>
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

// Pass via Recharts' `content` prop:
//   <Tooltip content={<ChartTooltip formatter={compactNumber} />} />
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipPayload & {
  formatter?: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  const display = formatter ? formatter(value) : value.toString();
  return (
    <div
      className="rounded-sm border border-line-2 bg-surface px-2.5 py-1.5 shadow-[var(--sh-md)]"
      style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
    >
      <div className="text-ink">{display}</div>
      <div className="text-ink-3" style={{ fontSize: 9 }}>
        {label}
      </div>
    </div>
  );
}
