import { useEffect, useState } from "react";
import { useShell } from "@/components/shell-context";
import { getReportScopeIds } from "@/lib/data/reports";
import { averageHealth, BAND_BG, BAND_LABEL } from "@/lib/data/health";
import { relativeDate } from "@/lib/format";
import { Star } from "@/components/star";
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
  const { accounts, postsByAccount, categories } = useShell();
  const [scopedAccountIds, setScopedAccountIds] = useState<string[] | null>(
    null,
  );

  // Resolve the report's scope → account ids. For project scope this
  // is every account in the project (synchronous from context). For
  // category / account scopes we hit the join tables. The fetch is
  // skipped when the scope is "project" so the common case never
  // round-trips.
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (report.scope_kind === "project") {
        if (!cancelled) {
          setScopedAccountIds(accounts.map((a) => a.id));
        }
        return;
      }
      if (report.scope_kind === "account") {
        try {
          const ids = await getReportScopeIds(report.id, "account");
          if (!cancelled) setScopedAccountIds(ids);
        } catch {
          if (!cancelled) setScopedAccountIds([]);
        }
        return;
      }
      if (report.scope_kind === "category") {
        try {
          const categoryIds = await getReportScopeIds(report.id, "category");
          const ids = accounts
            .filter(
              (a) => a.category_id && categoryIds.includes(a.category_id),
            )
            .map((a) => a.id);
          if (!cancelled) setScopedAccountIds(ids);
        } catch {
          if (!cancelled) setScopedAccountIds([]);
        }
      }
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [report.id, report.scope_kind, accounts]);

  const scopeSummary = describeScope(report, scopedAccountIds, categories.length);
  const avg = scopedAccountIds
    ? averageHealth(postsByAccount, scopedAccountIds)
    : null;

  const s = STATUS_STYLE[report.status] ?? STATUS_STYLE.draft;

  return (
    <div className="tap-row block rounded-md border border-line bg-surface px-3.5 py-3.5 transition-colors duration-[120ms] hover:bg-surface-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="t-h1 truncate text-ink"
            style={{ fontFamily: "var(--font-unbounded)" }}
          >
            {report.name}
          </h3>
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
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {report.is_featured && (
            <span
              aria-label="Featured"
              title="Featured"
              className="inline-flex h-5 w-5 items-center justify-center text-accent"
            >
              <Star filled />
            </span>
          )}
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
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Meta label="Cadence" value={CADENCE_LABEL[report.cadence]} />
        <Meta label="Scope" value={scopeSummary} />
        <Meta
          label="Avg health"
          value={
            avg && avg.covered > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  data-numeric
                  className="text-ink"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {avg.avgHealth}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${BAND_BG[avg.band]}`}
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  {BAND_LABEL[avg.band]}
                </span>
              </span>
            ) : (
              "—"
            )
          }
        />
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

function describeScope(
  report: ReportRow,
  scopedIds: string[] | null,
  totalCategories: number,
): string {
  if (report.scope_kind === "project") {
    return `Project · ${scopedIds?.length ?? 0} accounts`;
  }
  if (report.scope_kind === "account") {
    return `${scopedIds?.length ?? 0} account${scopedIds?.length === 1 ? "" : "s"}`;
  }
  if (report.scope_kind === "category") {
    return `${scopedIds?.length ?? 0} accounts / ${totalCategories} cat`;
  }
  return "—";
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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
