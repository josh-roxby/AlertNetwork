"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getReport, updateReport } from "@/lib/data/reports";
import { relativeDate } from "@/lib/format";
import { useShell } from "@/components/shell-context";
import { IconEye } from "@/components/icons";
import { Star } from "@/components/star";
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

const SCOPE_LABEL: Record<ReportRow["scope_kind"], string> = {
  project: "Whole project",
  category: "Categories",
  account: "Accounts",
};

export function ReportDetail({ reportId }: { reportId: string }) {
  const { refreshReports, openSheet } = useShell();
  const [report, setReport] = useState<ReportRow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  async function mutate(patch: Parameters<typeof updateReport>[1]) {
    if (!report) return;
    setBusy(true);
    setError("");
    try {
      await updateReport(report.id, patch);
      const fresh = await getReport(report.id);
      if (fresh) setReport(fresh);
      await refreshReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update.");
    } finally {
      setBusy(false);
    }
  }

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
      <section className="mb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${s.wrap}`}
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
          />
          {s.label}
        </span>
        <div className="mt-2 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="t-display-3 truncate uppercase text-ink">
              {report.name}
            </h1>
            {report.description && (
              <p className="mt-1 t-small text-ink-2">{report.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => mutate({ is_featured: !report.is_featured })}
            disabled={busy}
            aria-pressed={report.is_featured}
            aria-label={
              report.is_featured ? "Unmark as featured" : "Mark as featured"
            }
            title={
              report.is_featured ? "Unmark as featured" : "Mark as featured"
            }
            className={`tap-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
              report.is_featured
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line-2 bg-surface text-ink-3 hover:text-ink"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Star filled={report.is_featured} />
          </button>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-2">
        <StatCell label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <StatCell label="Scope" value={SCOPE_LABEL[report.scope_kind]} />
        <StatCell label="Schedule" value={report.schedule ?? "—"} />
        <StatCell
          label="Last sent"
          value={
            report.last_sent_at ? relativeDate(report.last_sent_at) : "Not sent"
          }
        />
      </section>

      <section className="mb-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/reports/${report.id}/view`}
          className="tap-btn flex flex-1 items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 t-body font-semibold text-[#0A0A0A] hover:bg-accent-dim"
        >
          <IconEye stroke="#0A0A0A" />
          Open view
        </Link>
        <button
          type="button"
          onClick={() =>
            openSheet({ kind: "manageReport", reportId: report.id })
          }
          className="tap-btn inline-flex items-center justify-center gap-2 rounded-sm border border-line-2 bg-surface-2 px-4 py-3 t-body font-medium text-ink hover:bg-surface-3"
        >
          Manage
        </button>
      </section>

      {report.status === "draft" && (
        <section className="mb-5 rounded-md border border-accent-line bg-accent-soft px-3 py-2.5 t-small text-accent">
          This report is a draft. Activate it from Manage to schedule sends.
        </section>
      )}

      {error && (
        <p
          className="mb-5 rounded-sm border border-bad bg-bad-soft px-3 py-2 t-small text-bad"
          role="alert"
        >
          {error}
        </p>
      )}
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
