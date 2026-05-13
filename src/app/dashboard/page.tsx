import { StatsGrid, type Stat } from "@/components/stats-grid";
import { Chip, ChipDivider } from "@/components/chip";
import { FilterStrip } from "@/components/filter-strip";
import { AccountRow } from "@/components/account-row";
import { placeholderAccounts } from "@/lib/placeholder-data";
import { compactNumber } from "@/lib/format";
import { healthBand } from "@/components/health-score";

export default function DashboardPage() {
  const accounts = placeholderAccounts;
  const avgHealth = Math.round(
    accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length,
  );
  const movers = accounts.filter((a) => Math.abs(a.trendDelta) >= 20).length;
  const excellent = accounts.filter((a) => a.healthScore >= 80).length;
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);
  const dailyCount = accounts.filter((a) => a.tier === "daily").length;
  const weeklyCount = accounts.filter((a) => a.tier === "weekly").length;

  const stats: Stat[] = [
    {
      label: "Accounts",
      value: accounts.length.toString(),
      trend: { kind: "neutral", label: "Live" },
    },
    {
      label: "Avg health",
      value: avgHealth.toString(),
      trend: { kind: "good", label: "↑4.2" },
    },
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

      <section className="mb-5">
        <StatsGrid stats={stats} />
      </section>

      <section className="mb-4">
        <FilterStrip>
          <Chip active count={accounts.length}>
            All
          </Chip>
          <Chip count={excellent}>Excellent</Chip>
          <Chip
            count={accounts.filter((a) => healthBand(a.healthScore) === "strong").length}
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
          <button
            type="button"
            className="tap-btn t-micro text-ink-3 hover:text-ink"
          >
            Sort · Health ↓
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {[...accounts]
            .sort((a, b) => b.healthScore - a.healthScore)
            .map((a) => (
              <li key={a.id}>
                <AccountRow account={a} />
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}
