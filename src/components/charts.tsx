"use client";

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
import { useMemo, useState } from "react";
import { Sheet } from "@/components/sheet";
import { compactNumber, relativeDate } from "@/lib/format";
import type { PostRow } from "@/lib/data/types";

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

// ---------------------------------------------------------------------
// Chart drill-down
//
// Clicking (or tapping) any node on a chart opens a Sheet listing the
// posts from that day. Sheet primitive handles both surfaces — bottom-
// anchored drawer on phones, centred panel on `sm+`.
//
// Usage:
//   const drill = useChartDrill({ posts });
//   <AreaChart data={series} onClick={drill.onChartClick}>...
//   {drill.drill}
//
// Pass `accountById` when the chart covers more than one account
// (e.g. the report-detail trends across all scoped accounts) so the
// drill rows can label which account each post belongs to.

type ChartClickEvent = {
  activeLabel?: string | number;
  activePayload?: Array<{ payload?: { date?: string } }>;
};

export type AccountLite = {
  id: string;
  handle: string;
  url?: string | null;
};

export function useChartDrill(opts: {
  posts: PostRow[];
  accountById?: Map<string, AccountLite>;
  // Optional override — used to override the auto-derived window
  // label (e.g. "Posts on Tue 20 May").
  dateFormatter?: (yyyyMmDd: string) => string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function onChartClick(payload: ChartClickEvent | null | undefined) {
    if (!payload) return;
    // Recharts passes the active X-axis value in `activeLabel`. Bar /
    // Area / Line all behave the same. We also dig into activePayload
    // as a backup since some interaction modes (e.g. dot-only clicks)
    // can omit activeLabel.
    const fromLabel =
      typeof payload.activeLabel === "string" ? payload.activeLabel : null;
    const fromPayload =
      payload.activePayload?.[0]?.payload?.date ?? null;
    const date = fromLabel ?? fromPayload;
    if (!date) return;
    setSelectedDate(date);
  }

  const postsForDay = useMemo(() => {
    if (!selectedDate) return [];
    return opts.posts
      .filter((p) => p.posted_at.slice(0, 10) === selectedDate)
      .sort((a, b) => b.views - a.views);
  }, [selectedDate, opts.posts]);

  const dateLabel = selectedDate
    ? opts.dateFormatter
      ? opts.dateFormatter(selectedDate)
      : formatChartDay(selectedDate)
    : "";

  const drill = (
    <Sheet
      open={!!selectedDate}
      onClose={() => setSelectedDate(null)}
      title={dateLabel || "Posts on this day"}
      description={
        selectedDate
          ? postsForDay.length === 1
            ? "1 post"
            : `${postsForDay.length} posts`
          : undefined
      }
      footer={
        <button
          type="button"
          onClick={() => setSelectedDate(null)}
          className="tap-btn rounded-sm border border-line-2 bg-surface px-4 py-2.5 t-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Close
        </button>
      }
    >
      {postsForDay.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-2 bg-surface px-3 py-6 text-center t-small text-ink-3">
          No posts cached for this day. The window might include zero-
          fill days where nothing was published.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {postsForDay.map((post) => (
            <li key={post.id}>
              <DrillPostRow
                post={post}
                handle={opts.accountById?.get(post.account_id)?.handle}
              />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );

  return { onChartClick, drill, selectedDate };
}

function DrillPostRow({ post, handle }: { post: PostRow; handle?: string }) {
  const caption = (post.caption ?? "").trim() || "(no caption)";
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <div
        className="t-body text-ink"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {caption}
      </div>
      <div
        data-numeric
        className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 t-meta text-ink-3"
        style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
      >
        {handle && <span className="text-ink-2">{handle}</span>}
        <span>{compactNumber(post.views)} views</span>
        <span>{compactNumber(post.likes)} likes</span>
        <span>{compactNumber(post.comments)} comments</span>
        <span>{compactNumber(post.shares)} shares</span>
        <span>{relativeDate(post.posted_at)}</span>
      </div>
      {post.url && (
        <div className="mt-2.5">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-btn inline-flex items-center gap-1.5 rounded-xs border border-line-2 bg-surface-2 px-2.5 py-1 t-small text-ink-2 hover:border-ink-3 hover:bg-surface-3 hover:text-ink"
          >
            Open on platform
            <span aria-hidden>&rarr;</span>
          </a>
        </div>
      )}
    </div>
  );
}

// "Tue 20 May" — short readable day. Kept here so the drill header
// matches across both /accounts/[id] and /reports/[id] charts.
function formatChartDay(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}
