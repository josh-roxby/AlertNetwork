import { ReportDetail } from "@/components/report-detail";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ReportDetail is a client component that fetches the row itself
  // (RLS-gated via the browser client) and renders 404 if missing.
  return <ReportDetail reportId={id} />;
}
