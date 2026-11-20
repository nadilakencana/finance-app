import { TransactionsClient } from './transactions-client';

// Server Component kecil: di Next.js 16 `searchParams` berupa Promise, jadi di-await di sini,
// lalu nilainya dioper ke Client Component yang melakukan fetch ke backend.
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  const { accountId } = await searchParams;
  return <TransactionsClient initialAccountId={accountId ?? null} />;
}
