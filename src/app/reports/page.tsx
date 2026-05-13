import { ReportCard } from "@/components/report-card";
import { placeholderReports } from "@/lib/placeholder-data";

export default function ReportsPage() {
  return (
    <>
      <section className="mb-4">
        <h1 className="t-display-1 uppercase text-ink">Reports</h1>
        <p className="mt-1 t-small text-ink-3">
          Scheduled email snapshots. Tap a report for the most recent send,
          history and edit controls.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <span data-numeric className="t-small text-ink-2">
            {placeholderReports.length} reports
          </span>
          <button
            type="button"
            className="tap-btn t-micro text-ink-3 hover:text-ink"
          >
            Sort · Last sent
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {placeholderReports.map((r) => (
            <li key={r.id}>
              <ReportCard report={r} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
