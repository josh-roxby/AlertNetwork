import { relativeDate } from "@/lib/format";
import type { ReportRow } from "@/lib/data/types";

const STATUS_STYLE: Record<
  string,
  { wrap: string; dot: string; label: string }
> = {
  active: {
    wrap: "bg-good-soft text-good",
    dot: "bg-good pulse-dot",
    label: "Live",
  },
  paused: {
    wrap: "bg-surface-3 text-ink-3",
    dot: "bg-ink-3",
    label: "Paused",
  },
  draft: {
    wrap: "bg-accent-soft text-accent",
    dot: "bg-accent",
    label: "Draft",
  },
};

const CADENCE_LABEL: Record<ReportRow["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

export function ReportCard({ report }: { report: ReportRow }) {
  const s = STATUS_STYLE[report.status] ?? STATUS_STYLE.draft;

  return (
    <div className="tap-row block rounded-md border border-line bg-surface px-3.5 py-3.5 transition-colors duration-[120ms] hover:bg-surface-2">
      <div className="flex items-start justify-between gap-3">
        <h3
          className="t-h1 text-ink"
          style={{ fontFamily: "var(--font-unbounded)" }}
        >
          {report.name}
        </h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 ${s.wrap}`}
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
          />
          {s.label}
        </span>
      </div>
      {report.description && (
        <p
          className="mt-1 t-small text-ink-3"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {report.description}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
        <Meta label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <Meta label="Schedule" value={report.schedule ?? "—"} />
      </div>
      <div
        className="mt-2 t-meta text-right text-ink-3"
        style={{ fontSize: 10 }}
      >
        {report.last_sent_at
          ? `Sent ${relativeDate(report.last_sent_at)}`
          : "Not sent yet"}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-micro text-ink-3" style={{ fontSize: 9 }}>
        {label}
      </div>
      <div
        data-numeric
        className="mt-0.5 text-ink"
        style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
      >
        {value}
      </div>
    </div>
  );
}
