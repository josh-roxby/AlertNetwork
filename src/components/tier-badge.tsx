import type { Tier } from "@/lib/placeholder-data";

const STYLES: Record<
  Tier,
  { wrap: string; dot?: string; border?: string }
> = {
  daily: {
    wrap: "bg-accent-soft text-accent border border-accent-line",
    dot: "bg-accent",
  },
  weekly: {
    wrap: "bg-surface-3 text-ink-2 border border-line-2",
  },
  hourly: {
    wrap:
      "bg-transparent text-accent border border-dashed border-accent-line",
  },
};

export function TierBadge({ tier }: { tier: Tier }) {
  const s = STYLES[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${s.wrap}`}
      style={{ fontSize: 10, letterSpacing: "0.16em", fontWeight: 600 }}
      data-numeric
    >
      {s.dot && (
        <span
          aria-hidden
          className={`pulse-dot inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
        />
      )}
      <span className="uppercase">{tier}</span>
    </span>
  );
}
