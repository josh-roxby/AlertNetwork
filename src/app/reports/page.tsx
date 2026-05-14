"use client";

import Link from "next/link";
import { useShell, useActiveProject } from "@/components/shell-context";
import { ReportCard } from "@/components/report-card";
import { IconPlus } from "@/components/icons";
import { SkeletonProjectList } from "@/components/skeletons";

export default function ReportsPage() {
  const { activeProjectId, reports, reportsLoading, openSheet } = useShell();
  const project = useActiveProject();

  if (!activeProjectId) {
    return null;
  }

  if (reportsLoading) {
    return (
      <>
        <section className="mb-4">
          <h1 className="t-display-1 uppercase text-ink">Reports</h1>
        </section>
        <SkeletonProjectList count={2} />
      </>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 text-center">
        <span
          aria-hidden
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <IconPlus />
        </span>
        <h1 className="t-display-3 uppercase text-ink">No reports yet</h1>
        <p className="mt-2 max-w-[34ch] t-body text-ink-2">
          A report is a scheduled summary of accounts in{" "}
          {project?.name ?? "this project"}. Create one to send metrics on a
          weekly or monthly cadence.
        </p>
        <button
          type="button"
          onClick={() => openSheet({ kind: "newReport" })}
          className="tap-btn mt-5 inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          <IconPlus stroke="#0A0A0A" />
          New report
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="t-display-1 uppercase text-ink">Reports</h1>
          <p className="mt-1 t-small text-ink-3">
            Scheduled summaries for {project?.name ?? "this project"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openSheet({ kind: "newReport" })}
          className="tap-btn inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-accent px-3 py-2 t-small font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          <IconPlus stroke="#0A0A0A" />
          New
        </button>
      </section>

      <ul className="flex flex-col gap-2">
        {reports.map((r) => (
          <li key={r.id}>
            <Link href={`/reports/${r.id}`} className="block">
              <ReportCard report={r} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
