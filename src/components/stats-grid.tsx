type Trend =
  | { kind: "good"; label: string }
  | { kind: "bad"; label: string }
  | { kind: "neutral"; label: string }
  | null;

export type Stat = {
  label: string;
  // Optional ReactNode that replaces the rendered label — used by
  // tiles that want an interactive header (e.g. a window-range
  // dropdown). The text `label` is still required because it backs
  // the `key` used when rendering the grid.
  labelEl?: React.ReactNode;
  value: string;
  trend?: Trend;
};

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s) => (
        <Cell key={s.label} {...s} />
      ))}
    </div>
  );
}

function Cell({ label, labelEl, value, trend }: Stat) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <div className="t-micro text-ink-3">{labelEl ?? label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span
          data-numeric
          className="t-display-2 leading-none text-ink"
          style={{ fontWeight: 800 }}
        >
          {value}
        </span>
        {trend && <TrendPill {...trend} />}
      </div>
    </div>
  );
}

function TrendPill(trend: NonNullable<Trend>) {
  const tone =
    trend.kind === "good"
      ? "bg-good-soft text-good"
      : trend.kind === "bad"
        ? "bg-bad-soft text-bad"
        : "bg-surface-2 text-ink-3";
  return (
    <span
      data-numeric
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}
    >
      {trend.label}
    </span>
  );
}
