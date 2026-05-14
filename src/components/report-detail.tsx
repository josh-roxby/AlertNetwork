"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getReport } from "@/lib/data/reports";
import { relativeDate } from "@/lib/format";
import { IconEye } from "@/components/icons";
import type { ReportRow } from "@/lib/data/types";

const CADENCE_LABEL: Record<ReportRow["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

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

export function ReportDetail({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<ReportRow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    getReport(reportId)
      .then((row) => {
        if (cancelled) return;
        if (row) {
          setReport(row);
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-ink-3">
        <span className="t-small">Loading report…</span>
      </div>
    );
  }

  if (status === "missing" || !report) {
    return (
      <div className="rounded-md border border-line bg-surface px-4 py-8 text-center">
        <p className="t-body text-ink-2">Report not found.</p>
        <Link
          href="/reports"
          className="tap-btn mt-3 inline-block t-small text-accent hover:opacity-80"
        >
          ← Back to reports
        </Link>
      </div>
    );
  }

  const s = STATUS_STYLE[report.status] ?? STATUS_STYLE.draft;

  return (
    <>
      <section className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="t-display-3 truncate uppercase text-ink">
            {report.name}
          </h1>
          {report.description && (
            <p className="mt-1 t-small text-ink-2">{report.description}</p>
          )}
        </div>
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
      </section>

      <section className="mb-5 grid grid-cols-2 gap-2">
        <StatCell label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <StatCell label="Scope" value="Whole project" />
        <StatCell label="Schedule" value={report.schedule ?? "—"} />
        <StatCell
          label="Last sent"
          value={
            report.last_sent_at ? relativeDate(report.last_sent_at) : "Not sent"
          }
        />
      </section>

      <section className="mb-5">
        <Link
          href={`/reports/${report.id}/view`}
          className="tap-btn flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          <IconEye stroke="#0A0A0A" />
          Open view
        </Link>
      </section>

      <section className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-6 text-center">
        <h2 className="t-h2 text-ink">No sends yet</h2>
        <p className="mx-auto mt-2 max-w-[36ch] t-small text-ink-2">
          Recipients, account scope-overrides, send history and live charts
          arrive in a later round. For now reports are project-wide and the
          schedule is fixed.
        </p>
      </section>
    </>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-3">
      <div className="t-micro text-ink-3">{label}</div>
      <div
        data-numeric
        className="mt-1 text-ink"
        style={{
          fontFamily: "var(--font-unbounded)",
          fontWeight: 800,
          fontSize: 18,
        }}
      >
        {value}
      </div>
    </div>
  );
}
