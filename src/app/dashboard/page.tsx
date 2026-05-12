import { PageHeader } from "@/components/page-header";
import { HealthScore, TrendArrow } from "@/components/health-score";
import { placeholderAccounts } from "@/lib/placeholder-data";
import { compactNumber, percent, relativeDate } from "@/lib/format";

export default function DashboardPage() {
  const accounts = placeholderAccounts;
  const avgHealth =
    accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length;
  const movers = accounts.filter((a) => Math.abs(a.trendDelta) >= 20).length;
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of every monitored account in the current project."
      />

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">All accounts</h2>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
            Sorted by health · desc
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium text-right">Followers</th>
                <th className="px-4 py-3 font-medium text-right">
                  Median views
                </th>
                <th className="px-4 py-3 font-medium text-right">Engagement</th>
                <th className="px-4 py-3 font-medium text-right">Health</th>
                <th className="px-4 py-3 font-medium text-right">Trend</th>
                <th className="px-4 py-3 font-medium text-right">Logged</th>
              </tr>
            </thead>
            <tbody>
              {[...accounts]
                .sort((a, b) => b.healthScore - a.healthScore)
                .map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-border hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.handle}</div>
                      <div className="text-xs text-muted">
                        {a.tags.join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted">
                      {a.tier}
                    </td>
                    <td
                      data-numeric
                      className="px-4 py-3 text-right"
                    >
                      {compactNumber(a.followers)}
                    </td>
                    <td data-numeric className="px-4 py-3 text-right">
                      {compactNumber(a.medianViews)}
                    </td>
                    <td data-numeric className="px-4 py-3 text-right">
                      {percent(a.engagementRatio)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <HealthScore score={a.healthScore} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TrendArrow delta={a.trendDelta} />
                    </td>
                    <td
                      data-numeric
                      className="px-4 py-3 text-right text-muted"
                    >
                      {relativeDate(a.lastLoggedAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-2">
        {label}
      </div>
      <div data-numeric className="mt-2 text-2xl font-semibold">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
