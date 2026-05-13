import { PageHeader } from "@/components/page-header";
import { NewReportAction } from "@/components/create-actions";
import { placeholderReports } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Project · Spring Music Sponsorships"
        title="Reports"
        description="Configurable snapshots delivered by email. One-off or scheduled."
        actions={<NewReportAction />}
      />

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <table className="w-full table-fixed sm:table-auto">
          <thead className="bg-surface-3">
            <tr className="t-micro text-left text-ink-3">
              <th scope="col" className="px-3 py-3 sm:px-4">
                Name
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 lg:table-cell"
              >
                Scope
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 sm:table-cell"
              >
                Cadence
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-right md:table-cell"
              >
                Recipients
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right sm:px-4"
              >
                Last sent
              </th>
            </tr>
          </thead>
          <tbody>
            {placeholderReports.map((r) => (
              <tr
                key={r.id}
                className="border-t border-line transition-colors duration-[120ms] hover:bg-surface-2"
              >
                <td className="px-3 py-3 sm:px-4">
                  <div className="t-body font-medium text-ink">{r.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 sm:hidden">
                    <span className="t-small capitalize text-ink-2">
                      {r.cadence}
                    </span>
                    <span className="t-small text-ink-4">·</span>
                    <span className="t-small truncate text-ink-3">
                      {r.scope}
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 t-body text-ink-2 lg:table-cell">
                  {r.scope}
                </td>
                <td className="hidden px-4 py-3 t-body capitalize text-ink-2 sm:table-cell">
                  {r.cadence}
                </td>
                <td
                  data-numeric
                  className="hidden px-4 py-3 text-right text-ink md:table-cell"
                >
                  {r.recipients}
                </td>
                <td
                  data-numeric
                  className="px-3 py-3 text-right text-ink-3 sm:px-4"
                  style={{ fontSize: 11 }}
                >
                  {r.lastSentAt ? relativeDate(r.lastSentAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
