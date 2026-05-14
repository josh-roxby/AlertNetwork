import { notFound } from "next/navigation";
import { AccountDetail } from "@/components/account-detail";
import { accountTimeSeries, findAccount } from "@/lib/placeholder-data";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = findAccount(id);
  if (!account) notFound();
  const series = accountTimeSeries(account, 90);
  return <AccountDetail account={account} series={series} />;
}
