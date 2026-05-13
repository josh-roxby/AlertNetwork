import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/button";
import { placeholderReports } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Project · Spring Music Sponsorships"
        title="Reports"
        description="Configurable snapshots delivered by email. One-off or scheduled."
        actions={<Button>New report</Button>}
      />

      <div className="overflow-hidden rounded-md border border-line bg-surface">
       <div className="scroll-x overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="bg-surface-3">
            <tr className="t-micro text-left text-ink-3">
              <th scope="col" className="px-4 py-3">
                Name
              </th>
              <th scope="col" className="px-4 py-3">
                Scope
              </th>
              <th scope="col" className="px-4 py-3">
                Cadence
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Recipients
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Last sent
              </th>
            </tr>
          </thead>
          <tbody>
            {placeholderReports.map((r) => (
              <tr
                key={r.id}
                className="border-t border-line transition-colors duration-[120ms] hover:bg-surface-2"
                style={{ height: 56 }}
              >
                <td className="px-4 t-body font-medium text-ink">{r.name}</td>
                <td className="px-4 t-body text-ink-2">{r.scope}</td>
                <td className="px-4 t-body capitalize text-ink-2">
                  {r.cadence}
                </td>
                <td data-numeric className="px-4 text-right text-ink">
                  {r.recipients}
                </td>
                <td
                  data-numeric
                  className="px-4 text-right text-ink-3"
                  style={{ fontSize: 11 }}
                >
                  {r.lastSentAt ? relativeDate(r.lastSentAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
      </div>
    </>
  );
}
