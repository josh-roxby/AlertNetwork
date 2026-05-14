import { notFound } from "next/navigation";
import {
  accountsForReport,
  findReport,
  type ReportHistoryEntry,
} from "@/lib/placeholder-data";
import { ReportView } from "@/components/report-view";

export default async function ReportViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historyId?: string }>;
}) {
  const { id } = await params;
  const { historyId } = await searchParams;

  const report = findReport(id);
  if (!report) notFound();

  let historyEntry: ReportHistoryEntry | undefined;
  if (historyId) {
    historyEntry = report.history.find((h) => h.id === historyId);
  }

  const accounts = accountsForReport(report);

  return (
    <ReportView
      report={report}
      accounts={accounts}
      historyEntry={historyEntry}
    />
  );
}
