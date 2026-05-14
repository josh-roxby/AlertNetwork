import { ReportView } from "@/components/report-view";

export default async function ReportViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportView reportId={id} />;
}
