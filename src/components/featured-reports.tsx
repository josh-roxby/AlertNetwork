"use client";

import Link from "next/link";
import { useShell } from "@/components/shell-context";
import { Star } from "@/components/star";
import { relativeDate } from "@/lib/format";
import { IconChevronRight, IconPlus } from "@/components/icons";
import type { ReportRow } from "@/lib/data/types";

const CADENCE_LABEL: Record<ReportRow["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-good pulse-dot",
  paused: "bg-ink-3",
  draft: "bg-accent",
};

// Featured reports section for the dashboard. Three states:
//   - no reports at all  → "create your first report" CTA
//   - reports exist but none flagged is_featured → prompt to favourite
//   - featured reports exist → render them as cards
export function FeaturedReports({ max = 3 }: { max?: number }) {
  const { reports, reportsLoading, openSheet } = useShell();

  if (reportsLoading) return null;

  if (reports.length === 0) {
    return (
      <section>
        <SectionHeading />
        <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-5 text-center">
          <p className="t-body text-ink-2">No reports yet.</p>
          <p className="mx-auto mt-1 max-w-[38ch] t-small text-ink-3">
            Create one to schedule a weekly or monthly summary.
          </p>
          <button
            type="button"
            onClick={() => openSheet({ kind: "newReport" })}
            className="tap-btn mt-3 inline-flex items-center gap-2 rounded-sm bg-accent px-3 py-1.5 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim"
          >
            <IconPlus stroke="#0A0A0A" />
            New report
          </button>
        </div>
      </section>
    );
  }

  const featured = reports.filter((r) => r.is_featured).slice(0, max);

  if (featured.length === 0) {
    return (
      <section>
        <SectionHeading />
        <div className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-5 text-center">
          <p className="t-body text-ink-2">No favourites yet.</p>
          <p className="mx-auto mt-1 max-w-[40ch] t-small text-ink-3">
            Open a report and tap the star to feature it here.
          </p>
          <Link
            href="/reports"
            className="tap-btn mt-3 inline-block t-small text-accent hover:opacity-80"
          >
            Browse reports →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading withAllLink />
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

function SectionHeading({ withAllLink }: { withAllLink?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <span className="t-micro text-ink-3">Featured reports</span>
      {withAllLink && (
        <Link
          href="/reports"
          className="tap-btn t-micro text-ink-3 hover:text-ink"
        >
          All →
        </Link>
      )}
    </div>
  );
}

function FeaturedTile({ report }: { report: ReportRow }) {
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
            className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[report.status] ?? STATUS_DOT.draft}`}
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
          {report.last_sent_at
            ? relativeDate(report.last_sent_at)
            : "Not sent"}
        </span>
      </span>
      <IconChevronRight className="shrink-0 text-ink-3" />
    </Link>
  );
}

// Re-export so older imports continue to work.
export { Star };
