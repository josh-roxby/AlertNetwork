import Link from "next/link";
import { type Report } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";

type Status = "live" | "paused" | "draft";

function statusFor(r: Report): Status {
  if (r.cadence === "one-off") return "draft";
  return r.lastSentAt ? "live" : "paused";
}

const STATUS_STYLE: Record<Status, { wrap: string; dot: string; label: string }> =
  {
    live: {
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
      label: "One-off",
    },
  };

const CADENCE_LABEL: Record<Report["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  "one-off": "One-off",
};

export function ReportCard({ report }: { report: Report }) {
  const s = STATUS_STYLE[statusFor(report)];

  return (
    <Link
      href={`/reports/${report.id}`}
      className="tap-row block rounded-md border border-line bg-surface px-3.5 py-3.5 transition-colors duration-[120ms] hover:bg-surface-2"
    >
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
      <p
        className="mt-1 t-small text-ink-3"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {report.scope}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Meta label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <Meta
          label="Recipients"
          value={report.recipients.toString()}
        />
        <Meta
          label="Last sent"
          value={report.lastSentAt ? relativeDate(report.lastSentAt) : "—"}
        />
      </div>
    </Link>
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
