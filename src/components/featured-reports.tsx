import Link from "next/link";
import { placeholderReports, type Report } from "@/lib/placeholder-data";
import { relativeDate } from "@/lib/format";
import { IconChevronRight } from "@/components/icons";

const STATUS_DOT: Record<Report["status"], string> = {
  live: "bg-good pulse-dot",
  paused: "bg-ink-3",
  draft: "bg-accent",
};

const CADENCE_LABEL: Record<Report["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

export function FeaturedReports({ max = 3 }: { max?: number }) {
  const featured = placeholderReports
    .filter((r) => r.isFeatured)
    .slice(0, max);

  if (featured.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="t-micro text-ink-3">Featured reports</span>
        <Link
          href="/reports"
          className="tap-btn t-micro text-ink-3 hover:text-ink"
        >
          All →
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {featured.map((r) => (
          <li key={r.id}>
            <FeaturedTile report={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FeaturedTile({ report }: { report: Report }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className="tap-row flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-3 transition-colors duration-[120ms] hover:bg-surface-2"
    >
      <span
        aria-hidden
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-accent"
      >
        <Star filled />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[report.status]}`}
          />
          <span className="t-body truncate font-semibold text-ink">
            {report.name}
          </span>
        </span>
        <span
          data-numeric
          className="mt-0.5 block truncate text-ink-3"
          style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
        >
          {CADENCE_LABEL[report.cadence]} ·{" "}
          {report.lastSentAt ? relativeDate(report.lastSentAt) : "Not sent"}
        </span>
      </span>
      <IconChevronRight className="shrink-0 text-ink-3" />
    </Link>
  );
}

export function Star({
  filled,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M8 1.6l1.9 4 4.3.4-3.2 2.9 1 4.2L8 11l-3.9 2.2 1-4.2-3.2-3 4.3-.4z" />
    </svg>
  );
}
