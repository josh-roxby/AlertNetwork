import { PageHeader } from "@/components/page-header";
import { placeholderReports } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Configurable snapshots delivered by email. One-off or scheduled."
        actions={
          <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:opacity-90">
            New report
          </button>
        }
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-2">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">Cadence</th>
              <th className="px-4 py-3 font-medium text-right">Recipients</th>
              <th className="px-4 py-3 font-medium text-right">Last sent</th>
            </tr>
          </thead>
          <tbody>
            {placeholderReports.map((r) => (
              <tr
                key={r.id}
                className="border-t border-border hover:bg-surface-2"
              >
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted">{r.scope}</td>
                <td className="px-4 py-3 capitalize text-muted">{r.cadence}</td>
                <td data-numeric className="px-4 py-3 text-right">
                  {r.recipients}
                </td>
                <td
                  data-numeric
                  className="px-4 py-3 text-right text-muted"
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
