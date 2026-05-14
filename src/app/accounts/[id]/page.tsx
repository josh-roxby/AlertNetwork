import { AccountDetail } from "@/components/account-detail";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // AccountDetail is a client component that fetches the row itself
  // (RLS-gated via the browser client). We pass the id down rather
  // than fetching server-side to keep one auth path.
  return <AccountDetail accountId={id} />;
}
