'use client';

import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth-context';
import type { DashboardSummary, FixedCost, GoldAsset, GoldPrices, Transaction } from '@/lib/types';
import { IconPlus } from '@/components/icons';
import { ErrorBox, Loading } from '@/components/ui';
import {
  BalanceCard,
  BillCalendar,
  BillsCard,
  CashFlowCard,
  GoldCard,
  MonthSummaryCard,
  PocketRings,
  RecentTransactionsCard,
  WeeklySpendCard,
} from './widgets';

function formatHariIni() {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

/*
 * Tata letak (urutan diatur dengan `order`, kolom pembungkus jadi `contents` di layar kecil):
 * - HP (1 kolom):  saldo, kantong, arus kas, pengeluaran, tagihan, kalender, ringkasan, transaksi, emas
 * - md–xl (2 kolom): kantong, saldo | emas, arus kas, pengeluaran | tagihan, kalender | ringkasan, transaksi
 * - 2xl (3 kolom seperti contoh): [saldo, emas] [kantong, arus kas, pengeluaran+tagihan, transaksi] [kalender, ringkasan]
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const summary = useApi<DashboardSummary>('/dashboard/summary');
  const transactions = useApi<Transaction[]>('/transactions');
  const bills = useApi<FixedCost[]>('/fixed-costs');
  const gold = useApi<GoldAsset[]>('/gold-assets');
  const goldPrices = useApi<GoldPrices>('/gold-prices');

  if (summary.loading) return <Loading />;
  if (summary.error || !summary.data) return <ErrorBox message={summary.error ?? 'Gagal memuat dashboard'} />;

  const data = summary.data;
  const txs = transactions.data ?? [];
  const billList = bills.data ?? [];
  const initial = user?.email.charAt(0).toUpperCase() ?? '?';

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm text-muted">{formatHariIni()}</span>
          <h1 className="font-display text-2xl font-medium md:text-3xl">Dashboard</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/transactions"
            aria-label="Catat transaksi"
            className="flex size-11 items-center justify-center gap-2 rounded-lg bg-brand font-medium text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-4"
          >
            <IconPlus size={20} />
            <span className="hidden sm:inline">Catat transaksi</span>
          </Link>
          {/* HP: avatar membuka menu Lainnya. Desktop: info akun saja (menu ada di sidebar). */}
          <Link href="/more" aria-label="Akun" className="flex size-11 items-center justify-center rounded-full bg-mint font-display text-lg font-medium text-ink md:hidden">
            <span aria-hidden="true">{initial}</span>
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-mint font-display text-lg font-medium text-ink">
              {initial}
            </span>
            <span className="hidden max-w-48 flex-col lg:flex">
              <span className="truncate text-sm font-medium">{user?.email}</span>
              <span className="text-xs text-muted">Pengguna</span>
            </span>
          </div>
        </div>
      </header>

      {transactions.error && <ErrorBox message={`Grafik tidak bisa dimuat: ${transactions.error}`} />}

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        {/* Kolom kiri */}
        <div className="contents 2xl:flex 2xl:flex-col 2xl:gap-4">
          <div className="order-1 md:order-2 2xl:order-none">
            <BalanceCard total={data.totalBalance} accounts={data.accounts} />
          </div>
          <div className="order-9 md:order-3 2xl:order-none">
            <GoldCard gold={data.goldAssets} assets={gold.data ?? []} prices={goldPrices.data} />
          </div>
        </div>

        {/* Kolom tengah */}
        <div className="contents 2xl:flex 2xl:flex-col 2xl:gap-4">
          <div className="order-2 md:order-1 md:col-span-2 2xl:order-none">
            <PocketRings pockets={data.pockets} />
          </div>
          <div className="order-3 md:order-4 md:col-span-2 2xl:order-none">
            <CashFlowCard transactions={txs} />
          </div>
          <div className="contents 2xl:grid 2xl:grid-cols-2 2xl:items-start 2xl:gap-4">
            <div className="order-4 md:order-5 2xl:order-none">
              <WeeklySpendCard transactions={txs} />
            </div>
            <div className="order-5 md:order-6 2xl:order-none">
              <BillsCard bills={billList} />
            </div>
          </div>
          <div className="order-8 md:order-9 md:col-span-2 2xl:order-none">
            <RecentTransactionsCard transactions={data.recentTransactions} />
          </div>
        </div>

        {/* Kolom kanan */}
        <div className="contents 2xl:flex 2xl:flex-col 2xl:gap-4">
          <div className="order-6 md:order-7 2xl:order-none">
            <BillCalendar bills={billList} />
          </div>
          <div className="order-7 md:order-8 2xl:order-none">
            <MonthSummaryCard transactions={txs} />
          </div>
        </div>
      </div>
    </>
  );
}
