'use client';

import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { formatRupiah, formatTanggal } from '@/lib/format';
import type { DashboardSummary, Transaction } from '@/lib/types';
import { IconPlus } from '@/components/icons';
import { EmptyState, ErrorBox, Loading } from '@/components/ui';

function formatHariIni() {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

export default function DashboardPage() {
  const { data, error, loading } = useApi<DashboardSummary>('/dashboard/summary');

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Gagal memuat dashboard'} />;

  const pocketTotal = data.pockets.reduce((sum, p) => sum + p.currentAmount, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">{formatHariIni()}</span>
          <h1 className="font-display text-[26px] font-bold tracking-tight md:text-3xl">Dashboard</h1>
        </div>
        <Link href="/transactions" className="flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark">
          <IconPlus size={18} />
          Catat Transaksi
        </Link>
      </header>

      {/* Kartu ringkasan */}
      <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard wide dark label="Total saldo rekening" value={formatRupiah(data.totalBalance)} note={`dari ${data.accounts.length} rekening`} />
        <StatCard label="Dana di kantong" value={formatRupiah(pocketTotal)} note={`${data.pockets.length} kantong`} />
        <StatCard warn label="Tagihan belum lunas" value={formatRupiah(data.fixedCosts.unpaidAmount)} note={`${data.fixedCosts.unpaid} dari ${data.fixedCosts.total} tagihan`} />
        <StatCard label="Emas" value={`${data.goldAssets.totalWeightGrams} gram`} note={`Modal ${formatRupiah(data.goldAssets.totalInvestment)}`} />
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {/* Progres kantong */}
        <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Kantong</h2>
          {data.pockets.length === 0 && <EmptyState>Belum ada kantong.</EmptyState>}
          {data.pockets.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <div className="flex justify-between gap-3 text-[15px]">
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted">
                  {formatRupiah(p.currentAmount)} / {formatRupiah(p.targetAmount)}
                </span>
              </div>
              <ProgressBar percent={p.progressPercent} label={p.name} />
            </div>
          ))}
        </section>

        {/* Rekening */}
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Rekening</h2>
          {data.accounts.length === 0 && <EmptyState>Belum ada rekening.</EmptyState>}
          {data.accounts.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-[#eef0ec] py-3 last:border-0">
              <span className="font-semibold">{a.name}</span>
              <span className="font-semibold">{formatRupiah(a.balance)}</span>
            </div>
          ))}
        </section>
      </div>

      {/* Transaksi terbaru */}
      <section className="flex flex-col rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-2 font-display text-xl font-semibold">Transaksi terbaru</h2>
        {data.recentTransactions.length === 0 && <EmptyState>Belum ada transaksi.</EmptyState>}
        {data.recentTransactions.map((t) => (
          <TransactionRow key={t.id} t={t} />
        ))}
      </section>
    </>
  );
}

function StatCard({ label, value, note, dark, warn, wide }: { label: string; value: string; note: string; dark?: boolean; warn?: boolean; wide?: boolean }) {
  const style = dark
    ? 'bg-ink text-white'
    : warn
      ? 'bg-warn-soft text-warn-dark border border-[#f1d9bf]'
      : 'bg-surface border border-line';
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-4 md:gap-2 md:p-5 ${wide ? 'col-span-2 lg:col-span-1' : ''} ${style}`}>
      <span className="text-[13px] opacity-80">{label}</span>
      <span className="font-display text-lg font-bold md:text-[28px]">{value}</span>
      <span className="text-[13px] opacity-80">{note}</span>
    </div>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div role="progressbar" aria-label={`Progres ${label}`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-brand" style={{ width: `${p}%` }} />
    </div>
  );
}

function TransactionRow({ t }: { t: Transaction }) {
  const sign = t.type === 'INCOME' ? '+ ' : t.type === 'EXPENSE' ? '− ' : '';
  const color = t.type === 'INCOME' ? 'text-brand' : t.type === 'EXPENSE' ? 'text-warn' : 'text-ink';
  const source = t.pocket?.name ?? t.account?.name ?? '-';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0ec] py-3">
      <div className="flex flex-col">
        <span className="font-semibold">{t.category}</span>
        <span className="text-[13px] text-muted">
          {source} · {formatTanggal(t.date)}
        </span>
      </div>
      <span className={`font-bold ${color}`}>
        {sign}
        {formatRupiah(t.amount)}
      </span>
    </div>
  );
}
