import { notFound } from "next/navigation";
import { ReportDetail } from "@/components/report-detail";
import { accountsForReport, findReport } from "@/lib/placeholder-data";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = findReport(id);
  if (!report) notFound();
  const accounts = accountsForReport(report);

  return <ReportDetail report={report} accounts={accounts} />;
}
