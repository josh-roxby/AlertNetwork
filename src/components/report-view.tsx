"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getReport } from "@/lib/data/reports";
import { relativeDate } from "@/lib/format";
import type { ReportRow } from "@/lib/data/types";

const CADENCE_LABEL: Record<ReportRow["cadence"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
};

export function ReportView({ reportId }: { reportId: string }) {
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
      <main className="mx-auto max-w-3xl px-4 py-10 text-center text-ink-3">
        <span className="t-small">Loading report…</span>
      </main>
    );
  }

  if (status === "missing" || !report) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="t-body text-ink-2">Report not found.</p>
        <Link
          href="/reports"
          className="tap-btn mt-3 inline-block t-small text-accent hover:opacity-80"
        >
          ← Back to reports
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header
        className="mb-8 flex items-start justify-between gap-4 border-b border-line pb-6"
        data-print="show"
      >
        <div>
          <p
            className="t-meta text-ink-3"
            style={{ fontSize: 10, letterSpacing: "0.14em" }}
          >
            ALERT NETWORK · REPORT
          </p>
          <h1
            className="mt-1 text-ink"
            style={{
              fontFamily: "var(--font-unbounded)",
              fontWeight: 800,
              fontSize: 28,
              lineHeight: 1.1,
            }}
          >
            {report.name}
          </h1>
          {report.description && (
            <p className="mt-2 t-body text-ink-2">{report.description}</p>
          )}
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <Meta label="Scope" value="Whole project" />
        <Meta label="Schedule" value={report.schedule ?? "—"} />
        <Meta
          label="Last sent"
          value={
            report.last_sent_at ? relativeDate(report.last_sent_at) : "Not sent"
          }
        />
      </section>

      <section className="rounded-md border border-dashed border-line-2 bg-surface px-4 py-8 text-center">
        <h2 className="t-h2 text-ink">No data yet</h2>
        <p className="mx-auto mt-2 max-w-[44ch] t-small text-ink-2">
          The report view will surface per-account metrics, charts and a
          recipient-friendly summary once the daily scrape has run a few
          times. For now this is a stub.
        </p>
      </section>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="t-meta text-ink-3"
        style={{ fontSize: 10, letterSpacing: "0.14em" }}
      >
        {label.toUpperCase()}
      </div>
      <div
        data-numeric
        className="mt-1 text-ink"
        style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}
      >
        {value}
      </div>
    </div>
  );
}
