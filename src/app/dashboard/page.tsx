import Link from "next/link";
import { StatsGrid, type Stat } from "@/components/stats-grid";
import { Chip, ChipDivider } from "@/components/chip";
import { FilterStrip } from "@/components/filter-strip";
import { AccountRow } from "@/components/account-row";
import { AddAccountTile } from "@/components/add-account-tile";
import { MetricLegend } from "@/components/metric-legend";
import { FeaturedReports } from "@/components/featured-reports";
import {
  CATEGORIES,
  placeholderAccounts,
  placeholderReports,
} from "@/lib/placeholder-data";
import { compactNumber } from "@/lib/format";
import { healthBand } from "@/components/health-score";

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);

const CATEGORY_COLOR: Record<string, string> = {
  fashion: "bg-cat-fashion",
  food: "bg-cat-food",
  beauty: "bg-cat-beauty",
  tech: "bg-cat-tech",
  sports: "bg-cat-sports",
  music: "bg-cat-music",
  travel: "bg-cat-travel",
  lifestyle: "bg-cat-lifestyle",
};

export default function DashboardPage() {
  const accounts = placeholderAccounts;
  const reports = placeholderReports;

  const avgHealth = Math.round(
    accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length,
  );
  const movers = accounts.filter((a) => Math.abs(a.trendDelta) >= 20).length;
  const excellent = accounts.filter((a) => a.healthScore >= 80).length;
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);
  const dailyCount = accounts.filter((a) => a.tier === "daily").length;
  const weeklyCount = accounts.filter((a) => a.tier === "weekly").length;
  const liveReports = reports.filter((r) => r.status === "live").length;

  const categoriesInUse = new Set(accounts.map((a) => a.category)).size;

  const topAccount = [...accounts].sort(
    (a, b) => b.healthScore - a.healthScore,
  )[0];

  const stats: Stat[] = [
    { label: "Accounts", value: accounts.length.toString() },
    {
      label: "Avg health",
      value: avgHealth.toString(),
      trend: { kind: "good", label: "↑4.2" },
    },
    {
      label: "Categories",
      value: `${categoriesInUse}/${CATEGORIES.length}`,
    },
    { label: "Live reports", value: liveReports.toString() },
    {
      label: "Movers",
      value: movers.toString(),
      trend: { kind: "neutral", label: "≥20%" },
    },
    {
      label: "Reach",
      value: compactNumber(totalFollowers),
      trend: { kind: "good", label: "↑18%" },
    },
  ];

  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Dashboard</h1>
        <p className="mt-1 t-small text-ink-3">
          Live snapshot of every monitored account in this project.
        </p>
      </section>

      {topAccount && (
        <section className="mb-2">
          <TopHealthTile
            handle={topAccount.handle}
            score={topAccount.healthScore}
            category={topAccount.category}
            trendDelta={topAccount.trendDelta}
          />
        </section>
      )}

      <section className="mb-7">
        <StatsGrid stats={stats} />
      </section>

      <section className="mb-7">
        <FeaturedReports max={3} />
      </section>

      <section className="mb-4">
        <FilterStrip>
          <Chip active count={accounts.length}>
            All
          </Chip>
          <Chip count={excellent}>Excellent</Chip>
          <Chip
            count={
              accounts.filter((a) => healthBand(a.healthScore) === "strong")
                .length
            }
          >
            Strong
          </Chip>
          <ChipDivider />
          <Chip count={dailyCount}>Daily</Chip>
          <Chip count={weeklyCount}>Weekly</Chip>
        </FilterStrip>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <span data-numeric className="t-small text-ink-2">
            {accounts.length} accounts
          </span>
          <Link
            href="/accounts"
            className="tap-btn t-micro text-ink-3 hover:text-ink"
          >
            See all →
          </Link>
        </div>
        <div className="mb-2 px-1">
          <MetricLegend />
        </div>
        <ul className="flex flex-col gap-2">
          {[...accounts]
            .sort((a, b) => b.healthScore - a.healthScore)
            .map((a) => (
              <li key={a.id}>
                <AccountRow account={a} />
              </li>
            ))}
          <li>
            <AddAccountTile />
          </li>
        </ul>
      </section>
    </>
  );
}

function TopHealthTile({
  handle,
  score,
  category,
  trendDelta,
}: {
  handle: string;
  score: number;
  category: string;
  trendDelta: number;
}) {
  const trendUp = trendDelta >= 0;
  return (
    <div className="rounded-md border border-accent-line bg-accent-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="t-micro text-ink-3">Top health</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              data-numeric
              className="leading-none text-ink"
              style={{
                fontFamily: "var(--font-unbounded)",
                fontWeight: 800,
                fontSize: 44,
                letterSpacing: "-0.015em",
              }}
            >
              {score}
            </span>
            <span
              data-numeric
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                trendUp ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
              }`}
            >
              {trendUp ? "↑" : "↓"}
              {Math.abs(trendDelta).toFixed(1)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 t-small text-ink">
            <span className="truncate font-semibold">{handle}</span>
            <span className="text-ink-3">·</span>
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span
                aria-hidden
                className={`inline-block h-1.5 w-1.5 rounded-full ${CATEGORY_COLOR[category]}`}
              />
              {CATEGORY_LABEL[category]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
