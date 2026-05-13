import { type Account } from "@/lib/placeholder-data";
import { compactNumber, percent, relativeDate } from "@/lib/format";
import { healthBand } from "@/components/health-score";

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

const BAND_TONE = {
  excellent: "text-accent",
  strong: "text-ink",
  watching: "text-ink-2",
  weak: "text-ink-3",
  critical: "text-bad",
} as const;

export function AccountRow({ account }: { account: Account }) {
  const band = healthBand(account.healthScore);
  const initial = account.handle.replace(/^@/, "").charAt(0).toUpperCase();
  const trendUp = account.trendDelta >= 0;

  return (
    <button
      type="button"
      className="tap-row group flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 text-left transition-colors duration-[120ms] hover:bg-surface-2"
    >
      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-3 ring-1 ring-line">
        <span
          className="t-h2 text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          {initial}
        </span>
        <span
          aria-hidden
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface ${CATEGORY_COLOR[account.category]}`}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              account.tier === "daily" ? "pulse-dot bg-accent" : "bg-ink-4"
            }`}
          />
          <span className="t-body truncate font-semibold text-ink">
            {account.handle}
          </span>
        </span>
        <span
          data-numeric
          className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-3"
        >
          <span>{compactNumber(account.medianViews)}</span>
          <span className="text-ink-4">·</span>
          <span>{percent(account.engagementRatio, 1)}</span>
          <span className="text-ink-4">·</span>
          <span>{CATEGORY_LABEL[account.category]}</span>
          <span className="text-ink-4">·</span>
          <span>{relativeDate(account.lastLoggedAt)}</span>
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end" style={{ minWidth: 48 }}>
        <span
          data-numeric
          className={`t-display-3 leading-none ${BAND_TONE[band]}`}
        >
          {account.healthScore}
        </span>
        <span
          data-numeric
          className={`mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
            trendUp ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
          }`}
        >
          {trendUp ? "↑" : "↓"}
          {Math.abs(account.trendDelta).toFixed(1)}
        </span>
      </span>
    </button>
  );
}
