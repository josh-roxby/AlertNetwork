import { PageHeader } from "@/components/page-header";
import { HealthScore, TrendArrow, healthBand } from "@/components/health-score";
import { TierBadge } from "@/components/tier-badge";
import { CategoryTag, Tag } from "@/components/category-tag";
import { placeholderAccounts } from "@/lib/placeholder-data";
import { compactNumber, percent, relativeDate } from "@/lib/format";

const BAND_LABEL = {
  critical: "Critical",
  weak: "Weak",
  watching: "Watching",
  strong: "Strong",
  excellent: "Excellent",
} as const;

export default function DashboardPage() {
  const accounts = placeholderAccounts;
  const avgHealth =
    accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length;
  const movers = accounts.filter((a) => Math.abs(a.trendDelta) >= 20).length;
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);

  return (
    <>
      <PageHeader
        eyebrow="Project · Spring Music Sponsorships"
        title="Dashboard"
        description="Live snapshot of every monitored account in the current project."
      />

      <section className="mb-5 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 lg:grid-cols-4">
        <Stat label="Accounts" value={accounts.length.toString()} />
        <Stat
          label="Avg health"
          value={avgHealth.toFixed(0)}
          hint="0–100 universal"
        />
        <Stat
          label="Movers (≥20%)"
          value={movers.toString()}
          hint="last 2 cycles"
        />
        <Stat
          label="Reach"
          value={compactNumber(totalFollowers)}
          hint="combined followers"
        />
      </section>

      <div className="mb-3 flex items-center gap-2">
        <span className="t-micro shrink-0 text-ink-3">Filter</span>
        <div className="scroll-x -mx-4 flex flex-1 items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {(["All", "Daily", "Weekly", "Excellent", "Movers"] as const).map(
            (chip, i) => (
              <FilterChip key={chip} active={i === 0}>
                {chip}
              </FilterChip>
            ),
          )}
        </div>
        <div className="t-micro ml-auto hidden text-ink-3 lg:block">
          Sorted by health · desc
        </div>
      </div>

      <section className="overflow-hidden rounded-md border border-line bg-surface">
        <table className="w-full table-fixed sm:table-auto">
          <thead className="bg-surface-3">
            <tr className="t-micro text-left text-ink-3">
              <th scope="col" className="px-3 py-3 sm:px-4">
                Account
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-right sm:table-cell sm:px-4"
              >
                Views
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-right md:table-cell"
              >
                Engagement
              </th>
              <th scope="col" className="px-3 py-3 text-right sm:px-4">
                Health
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 xl:table-cell"
              >
                Tags
              </th>
              <th
                scope="col"
                className="hidden px-3 py-3 text-center sm:table-cell sm:px-4"
              >
                Tier
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-right lg:table-cell"
              >
                Logged
              </th>
            </tr>
          </thead>
          <tbody>
            {[...accounts]
              .sort((a, b) => b.healthScore - a.healthScore)
              .map((a) => {
                const band = healthBand(a.healthScore);
                return (
                  <tr
                    key={a.id}
                    className="border-t border-line transition-colors duration-[120ms] hover:bg-surface-2"
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span
                          aria-hidden
                          className="hidden h-8 w-8 shrink-0 rounded-full bg-surface-3 ring-1 ring-line sm:inline-block"
                        />
                        <div className="min-w-0">
                          <div className="truncate t-body font-medium text-ink">
                            {a.handle}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 sm:hidden">
                            <span
                              data-numeric
                              className="t-small text-ink-2"
                            >
                              {compactNumber(a.medianViews)} views
                            </span>
                            <span className="t-small text-ink-4">·</span>
                            <span
                              data-numeric
                              className="t-small text-ink-2"
                            >
                              {percent(a.engagementRatio)}
                            </span>
                          </div>
                          <div className="hidden t-small text-ink-3 sm:block">
                            {a.displayName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      data-numeric
                      className="hidden px-3 py-3 text-right text-ink sm:table-cell sm:px-4"
                    >
                      {compactNumber(a.medianViews)}
                    </td>
                    <td
                      data-numeric
                      className="hidden px-4 py-3 text-right text-ink md:table-cell"
                    >
                      {percent(a.engagementRatio)}
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1.5 sm:gap-2">
                          <HealthScore score={a.healthScore} size="sm" />
                          <TrendArrow delta={a.trendDelta} />
                        </div>
                        <span className="t-micro mt-0.5 text-ink-3">
                          {BAND_LABEL[band]}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 xl:table-cell">
                      <div className="flex flex-wrap items-center gap-1">
                        <CategoryTag category={a.category} />
                        {a.tags.slice(0, 1).map((t) => (
                          <Tag key={t} label={t} />
                        ))}
                        {a.tags.length > 1 && (
                          <span className="t-small text-ink-3">
                            +{a.tags.length - 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-center sm:table-cell sm:px-4">
                      <TierBadge tier={a.tier} />
                    </td>
                    <td
                      data-numeric
                      className="hidden px-4 py-3 text-right text-ink-3 lg:table-cell"
                      style={{ fontSize: 11 }}
                    >
                      {relativeDate(a.lastLoggedAt)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-line bg-surface p-3 sm:p-4">
      <div className="t-micro text-ink-3">{label}</div>
      <div data-numeric className="t-display-3 mt-2 text-ink">
        {value}
      </div>
      {hint && (
        <div className="mt-1 t-small hidden text-ink-3 sm:block">{hint}</div>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`shrink-0 rounded-sm px-3 py-2 t-small transition-colors duration-[120ms] ${
        active
          ? "border border-accent-line bg-accent-soft text-accent"
          : "border border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
