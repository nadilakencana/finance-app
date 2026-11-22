'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatRupiah, formatRupiahSingkat, formatSingkat, formatTanggal } from '@/lib/format';
import type { Account, DashboardSummary, FixedCost, GoldAsset, GoldPrices, Transaction } from '@/lib/types';
import { totals as goldTotals } from '@/lib/gold';
import { BarChart, CountUp, LineChart, Ring } from '@/components/charts';
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconArrows,
  IconChevronLeft,
  IconChevronRight,
  IconBanknote,
  IconPlus,
  IconScale,
  IconTag,
} from '@/components/icons';

/* ---------- Bagian umum ---------- */

export const card = 'rounded-2xl border border-line bg-surface p-4 md:p-5';

function CardHeader({
  title,
  href,
  linkLabel = 'Lihat semua',
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2">
      <h2 className="font-display text-lg font-medium">{title}</h2>
      {children}
      {href && (
        <Link
          href={href}
          className="-mr-2 flex min-h-11 items-center px-2 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const namaBulan = (y: number, m: number) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m, 1));
const tanggalPendek = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(iso));
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ---------- Kartu saldo (pengganti kartu profil di contoh) ---------- */

export function BalanceCard({ total, accounts }: { total: number; accounts: Account[] }) {
  const sorted = [...accounts].sort((a, b) => b.balance - a.balance);
  const totalText = formatRupiah(total);
  // Angka miliaran ("Rp 1.879.173.500") turun satu ukuran supaya tetap muat satu baris
  const totalSize = totalText.length > 14 ? 'text-2xl' : 'text-[28px]';
  return (
    <section aria-labelledby="h-saldo" className={`${card} flex flex-col gap-4`}>
      {/* Momen visual: kartu bank */}
      <div className="relative overflow-hidden rounded-xl bg-brand p-5 text-white">
        <div aria-hidden="true" className="absolute -top-10 -right-10 size-36 rounded-full border-18 border-white/10" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span id="h-saldo" className="text-sm text-white/80">
              Total saldo
            </span>
            <span className="font-display text-sm font-medium text-mint">Kantong</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className={`font-display leading-none font-semibold whitespace-nowrap ${totalSize}`}>{totalText}</span>
            <span className="text-sm text-white/80">dari {accounts.length} rekening</span>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">Belum ada rekening.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1 text-[13px] text-muted">
            <span>Rekening</span>
            <span>{sorted.length}</span>
          </div>
          {/* Tinggi tetap ±5 baris; sisanya di-scroll di dalam kartu supaya kolom tidak memanjang */}
          <div className="relative rounded-xl border border-line">
            <ul
              tabIndex={sorted.length > 5 ? 0 : undefined}
              aria-label={`Saldo ${sorted.length} rekening`}
              className="max-h-60 overflow-y-auto overscroll-contain px-4 [scrollbar-width:thin]"
            >
              {sorted.map((a) => (
                <li key={a.id} className="flex h-12 items-center justify-between gap-3 border-b border-line-soft text-sm last:border-0">
                  <span className="min-w-0 truncate text-muted" title={a.name}>
                    {a.name}
                  </span>
                  <span className="font-medium whitespace-nowrap">{formatRupiah(a.balance)}</span>
                </li>
              ))}
            </ul>
            {sorted.length > 5 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-px bottom-px h-8 rounded-b-xl bg-linear-to-t from-surface to-transparent"
              />
            )}
          </div>
        </div>
      )}
      <Link
        href="/accounts"
        className="flex min-h-11 items-center justify-center rounded-lg border border-line-strong text-sm font-medium transition-colors hover:bg-raised"
      >
        Kelola rekening
      </Link>
    </section>
  );
}

/* ---------- Cincin kantong (pengganti kartu cuti) ---------- */

export function PocketRings({ pockets }: { pockets: DashboardSummary['pockets'] }) {
  const current = pockets.reduce((s, p) => s + p.currentAmount, 0);
  const target = pockets.reduce((s, p) => s + p.targetAmount, 0);
  const allPct = target > 0 ? Math.round((current / target) * 100) : 0;
  const top = [...pockets].sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 3);

  return (
    <section aria-label="Progres kantong" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <RingCard highlight label="Semua kantong" percent={allPct} current={current} target={target} delay={0} />
      {top.map((p, i) => (
        <RingCard
          key={p.id}
          delay={(i + 1) * 120}
          label={p.emoji ? `${p.emoji} ${p.name}` : p.name}
          percent={Math.round(p.progressPercent)}
          current={p.currentAmount}
          target={p.targetAmount}
        />
      ))}
      {top.length < 3 && (
        <Link
          href="/pockets"
          className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong p-4 text-center text-sm text-muted transition-colors hover:bg-surface"
        >
          <IconPlus />
          Buat kantong
        </Link>
      )}
    </section>
  );
}

function RingCard({
  label,
  percent,
  current,
  target,
  highlight,
  delay,
}: {
  label: string;
  percent: number;
  current: number;
  target: number;
  highlight?: boolean;
  delay: number;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl p-4 text-center ${highlight ? 'bg-brand-soft' : 'border border-line bg-surface'}`}
    >
      <span className={`w-full truncate text-sm ${highlight ? 'font-medium text-brand-dark' : 'text-muted'}`}>{label}</span>
      <Ring percent={percent} delay={delay} track={highlight ? 'text-surface' : 'text-line'}>
        <span className="font-display text-xl leading-none font-medium tabular-nums">
          <CountUp value={percent} delay={delay} />%
        </span>
        <span className="text-[13px] text-muted">terisi</span>
      </Ring>
      <span className="text-[13px] text-muted">
        <strong className="font-medium text-ink">{formatRupiahSingkat(current)}</strong> / {formatRupiahSingkat(target)}
      </span>
    </div>
  );
}

/* ---------- Arus kas (pengganti Performance Overview) ---------- */

export function CashFlowCard({ transactions }: { transactions: Transaction[] }) {
  const [months, setMonths] = useState<6 | 12>(6);
  const now = new Date();
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const income = keys.map(() => 0);
  const expense = keys.map(() => 0);
  for (const t of transactions) {
    const d = new Date(t.date);
    const i = keys.findIndex((k) => k.y === d.getFullYear() && k.m === d.getMonth());
    if (i === -1) continue;
    if (t.type === 'INCOME') income[i] += t.amount;
    if (t.type === 'EXPENSE') expense[i] += t.amount;
  }
  const last = months - 1;
  const net = income[last] - expense[last];
  const prevExpense = expense[last - 1];
  const change = prevExpense > 0 ? Math.round(((expense[last] - prevExpense) / prevExpense) * 100) : null;

  return (
    <section aria-labelledby="h-arus" className={`${card} flex flex-col gap-4`}>
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 id="h-arus" className="font-display text-lg font-medium">
          Arus kas
        </h2>
        <select
          aria-label="Rentang waktu"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value) as 6 | 12)}
          className="min-h-9 rounded-lg bg-brand-soft px-3 text-sm font-medium text-brand-dark"
        >
          <option value={6}>6 bulan</option>
          <option value={12}>12 bulan</option>
        </select>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">Selisih bulan ini</span>
          <span className={`font-display text-[28px] leading-none font-semibold ${net < 0 ? 'text-warn' : ''}`}>
            {net < 0 ? '− ' : ''}
            {formatRupiah(Math.abs(net))}
          </span>
          {change !== null && (
            <span className="text-[13px] text-muted">
              <span
                className={`mr-1 rounded px-1.5 py-0.5 font-medium ${change > 0 ? 'bg-warn-soft text-warn-dark' : 'bg-brand-soft text-brand-dark'}`}
              >
                {change > 0 ? '+' : ''}
                {change}%
              </span>
              pengeluaran vs bulan lalu
            </span>
          )}
        </div>
        <ul className="flex gap-4 text-sm">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-brand" />
            Pemasukan <strong className="font-medium">{formatRupiahSingkat(income[last])}</strong>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-warn" />
            Pengeluaran <strong className="font-medium">{formatRupiahSingkat(expense[last])}</strong>
          </li>
        </ul>
      </div>

      <LineChart
        labels={keys.map((k) => BULAN[k.m])}
        series={[
          { label: 'Pemasukan', values: income, stroke: 'text-brand', dot: 'bg-brand', area: true },
          { label: 'Pengeluaran', values: expense, stroke: 'text-warn', dot: 'bg-warn' },
        ]}
        formatTick={formatSingkat}
        formatValue={formatRupiah}
        tooltipTitle={(i) => namaBulan(keys[i].y, keys[i].m)}
      />
    </section>
  );
}

/* ---------- Pengeluaran 7 hari (pengganti Hours Logged) ---------- */

export function WeeklySpendCard({ transactions }: { transactions: Transaction[] }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i)));
  const values = days.map((d) =>
    transactions.filter((t) => t.type === 'EXPENSE' && sameDay(new Date(t.date), d)).reduce((s, t) => s + t.amount, 0),
  );
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <section aria-labelledby="h-minggu" className={`${card} flex flex-col gap-4`}>
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 id="h-minggu" className="font-display text-lg font-medium">
          Pengeluaran
        </h2>
        <span className="rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand-dark">7 hari terakhir</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-display text-[28px] leading-none font-semibold">{formatRupiah(total)}</span>
        <span className="text-[13px] text-muted">Rata-rata {formatRupiah(Math.round(total / 7))} per hari</span>
      </div>
      <BarChart
        labels={days.map((d) => HARI[d.getDay()])}
        values={values}
        highlight={6}
        formatValue={formatSingkat}
        describe={(i) => `${formatTanggal(days[i].toISOString())}: ${formatRupiah(values[i])}`}
      />
    </section>
  );
}

/* ---------- Tagihan (pengganti Documents) ---------- */

export function BillsCard({ bills }: { bills: FixedCost[] }) {
  const sorted = [...bills].sort((a, b) => Number(a.isPaid) - Number(b.isPaid) || a.dueDate - b.dueDate).slice(0, 4);
  return (
    <section aria-labelledby="h-tagihan" className={`${card} flex flex-col gap-2`}>
      <CardHeader title="Tagihan rutin" href="/fixed-costs" />
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Belum ada tagihan rutin.</p>
      ) : (
        <ul className="flex flex-col">
          {sorted.map((b) => (
            <li key={b.id} className="flex items-center gap-3 border-b border-line-soft py-3 last:border-0">
              {/* Badge tanggal jatuh tempo (signature: seperti cap tanggal di buku tabungan) */}
              <span
                aria-hidden="true"
                className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-lg leading-none ${b.isPaid ? 'bg-raised text-muted' : 'bg-warn-soft text-warn-dark'}`}
              >
                <span className="text-base font-medium text-ink">{b.dueDate}</span>
                <span className="mt-0.5 text-[11px]">{BULAN[new Date().getMonth()]}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{b.name}</span>
                <span className="text-[13px] text-muted">{formatRupiah(b.amount)}</span>
              </span>
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${b.isPaid ? 'bg-brand-soft text-brand-dark' : 'bg-warn-soft text-warn-dark'}`}
              >
                {b.isPaid ? 'Lunas' : 'Belum'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Kalender jatuh tempo (pengganti kalender di contoh) ---------- */

export function BillCalendar({ bills }: { bills: FixedCost[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => ({ y: today.getFullYear(), m: today.getMonth() }));
  const { y, m } = cursor;
  const isThisMonth = y === today.getFullYear() && m === today.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // minggu mulai Senin
  const prevDays = new Date(y, m, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;

  // Tagihan tgl 31 di bulan 30 hari -> jatuh di hari terakhir
  const billsOn = (d: number) => bills.filter((b) => Math.min(b.dueDate, daysInMonth) === d);
  const paid = bills.filter((b) => b.isPaid).length;

  function shift(delta: number) {
    const d = new Date(y, m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <section aria-labelledby="h-kalender" className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="h-kalender" className="font-display text-lg font-medium capitalize">
          {namaBulan(y, m)}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Bulan sebelumnya"
            className="flex size-11 items-center justify-center rounded-lg border border-line transition-colors hover:bg-raised md:size-9"
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Bulan berikutnya"
            className="flex size-11 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-dark md:size-9"
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[13px] text-muted" aria-hidden="true">
        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1 text-center text-sm">
        {Array.from({ length: total }, (_, i) => {
          const day = i - lead + 1;
          if (day < 1 || day > daysInMonth) {
            const other = day < 1 ? prevDays + day : day - daysInMonth;
            return (
              <li key={i} aria-hidden="true" className="mx-auto flex h-10 w-full max-w-11 items-center justify-center text-line-strong">
                {other}
              </li>
            );
          }
          const due = billsOn(day);
          const isToday = isThisMonth && day === today.getDate();
          let tone = '';
          if (due.length > 0) {
            if (!isThisMonth) tone = 'bg-brand-soft text-brand-dark';
            else if (due.every((b) => b.isPaid)) tone = 'bg-brand text-white';
            else tone = 'bg-warn-soft text-warn-dark';
          } else if (isToday) tone = 'bg-ink text-white';
          const label = due.length
            ? `${day}: ${due.map((b) => `${b.name}${isThisMonth ? (b.isPaid ? ' (lunas)' : ' (belum lunas)') : ''}`).join(', ')}`
            : undefined;
          return (
            <li
              key={i}
              aria-label={label}
              aria-current={isToday ? 'date' : undefined}
              className={`mx-auto flex h-10 w-full max-w-11 items-center justify-center rounded-lg font-medium ${tone} ${isToday && due.length ? 'ring-2 ring-ink ring-offset-1' : ''}`}
            >
              {day}
            </li>
          );
        })}
      </ol>

      <ul className="grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-[13px] text-muted">
        <li className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="h-1 rounded-full bg-brand" />
          Lunas <strong className="font-display text-base font-medium text-ink">{paid}</strong>
        </li>
        <li className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="h-1 rounded-full bg-warn-strong" />
          Belum lunas <strong className="font-display text-base font-medium text-ink">{bills.length - paid}</strong>
        </li>
        <li className="flex flex-col gap-1.5">
          <span aria-hidden="true" className="h-1 rounded-full bg-ink" />
          Hari ini <strong className="font-display text-base font-medium text-ink">{today.getDate()}</strong>
        </li>
      </ul>
    </section>
  );
}

/* ---------- Ringkasan bulan ini (pengganti Payroll Summary) ---------- */

function groupByCategory(list: Transaction[], limit: number) {
  const map = new Map<string, number>();
  for (const t of list) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length <= limit) return rows;
  const rest = rows.slice(limit - 1).reduce((s, [, v]) => s + v, 0);
  return [...rows.slice(0, limit - 1), ['Lainnya', rest] as [string, number]];
}

export function MonthSummaryCard({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const incomes = thisMonth.filter((t) => t.type === 'INCOME');
  const expenses = thisMonth.filter((t) => t.type === 'EXPENSE');
  const toPocket = thisMonth.filter((t) => t.type === 'TRANSFER_TO_POCKET').reduce((s, t) => s + t.amount, 0);
  const totalIn = incomes.reduce((s, t) => s + t.amount, 0);
  const totalOut = expenses.reduce((s, t) => s + t.amount, 0);
  const net = totalIn - totalOut;

  return (
    <section aria-labelledby="h-ringkasan" className={`${card} flex flex-col gap-3`}>
      <CardHeader title="Ringkasan bulan ini" />
      {thisMonth.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Belum ada transaksi bulan ini.</p>
      ) : (
        <dl className="flex flex-col text-sm">
          <div className="flex justify-between rounded-lg bg-raised px-3 py-2 text-[13px] text-muted">
            <dt>Keterangan</dt>
            <dd>Jumlah</dd>
          </div>
          <SummaryGroup title="Pemasukan" rows={groupByCategory(incomes, 4)} total={totalIn} />
          <SummaryGroup title="Pengeluaran" rows={groupByCategory(expenses, 5)} total={totalOut} />
          {toPocket > 0 && (
            <div className="flex justify-between border-b border-line-soft px-3 py-2.5">
              <dt className="text-muted">Dipindah ke kantong</dt>
              <dd className="font-medium">{formatRupiah(toPocket)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between px-3 pt-2.5 font-medium">
            <dt>Sisa bulan ini</dt>
            <dd className={net < 0 ? 'text-warn' : 'text-brand'}>
              {net < 0 ? '− ' : ''}
              {formatRupiah(Math.abs(net))}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function SummaryGroup({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <>
      <div className="flex justify-between border-b border-line-soft px-3 pt-3 pb-2 font-medium">
        <dt>{title}</dt>
        <dd>{formatRupiah(total)}</dd>
      </div>
      {rows.length === 0 && <div className="border-b border-line-soft px-3 py-2.5 text-muted">Belum ada</div>}
      {rows.map(([cat, v]) => (
        <div key={cat} className="flex justify-between gap-3 border-b border-line-soft py-2.5 pr-3 pl-6">
          <dt className="truncate text-muted">{cat}</dt>
          <dd className="whitespace-nowrap">{formatRupiah(v)}</dd>
        </div>
      ))}
    </>
  );
}

/* ---------- Emas (pengganti Personal Info) ---------- */

export function GoldCard({
  gold,
  assets,
  prices,
}: {
  gold: DashboardSummary['goldAssets'];
  assets: GoldAsset[];
  prices: GoldPrices | null;
}) {
  // Nilai sekarang butuh daftar pembelian (per jenis emas) + harga hari ini; kalau belum ada, tampilkan modal saja
  const t = assets.length > 0 && prices ? goldTotals(assets, prices) : null;
  const rows = [
    {
      Icon: IconScale,
      label: 'Total berat',
      value: <>{gold.totalWeightGrams.toLocaleString('id-ID', { maximumFractionDigits: 3 })} gram</>,
    },
    { Icon: IconBanknote, label: 'Total harga beli', value: <>{formatRupiah(gold.totalInvestment)}</> },
    t?.valueNow != null
      ? {
          Icon: IconTag,
          label: 'Nilai buyback sekarang',
          value: (
            <>
              {formatRupiah(t.valueNow)}{' '}
              {t.profit !== null && (
                <span className={`text-[13px] ${t.profit >= 0 ? 'text-brand' : 'text-warn'}`}>
                  ({t.profit >= 0 ? '+' : '−'}
                  {formatRupiahSingkat(Math.abs(t.profit))})
                </span>
              )}
            </>
          ),
        }
      : { Icon: IconTag, label: 'Rata-rata harga / gram', value: <>{formatRupiah(gold.avgBuyPrice)}</> },
  ];
  return (
    <section aria-labelledby="h-emas" className={`${card} flex flex-col gap-2`}>
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 id="h-emas" className="font-display text-lg font-medium">
          Emas
        </h2>
        <Link
          href="/gold-assets"
          className="-mr-2 flex min-h-11 items-center px-2 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
        >
          Detail
        </Link>
      </div>
      <dl className="flex flex-col">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2.5">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-raised text-muted">
              <r.Icon size={20} />
            </span>
            <div className="flex flex-col">
              <dt className="text-[13px] text-muted">{r.label}</dt>
              <dd className="text-sm font-medium">{r.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      {prices && t?.valueNow != null && <p className="text-xs text-muted">Harga buyback {prices.source}</p>}
    </section>
  );
}

/* ---------- Transaksi terbaru (pengganti Internal Notes) ---------- */

const TX_STYLE = {
  INCOME: { Icon: IconArrowDownLeft, tile: 'bg-brand-soft text-brand', amount: 'text-brand', sign: '+ ' },
  EXPENSE: { Icon: IconArrowUpRight, tile: 'bg-warn-soft text-warn', amount: 'text-warn', sign: '− ' },
  TRANSFER_TO_POCKET: { Icon: IconArrows, tile: 'bg-raised text-muted', amount: 'text-ink', sign: '' },
} as const;

export function RecentTransactionsCard({ transactions }: { transactions: Transaction[] }) {
  return (
    <section aria-labelledby="h-terbaru" className={`${card} flex flex-col gap-2`}>
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 id="h-terbaru" className="font-display text-lg font-medium">
          Transaksi terbaru
        </h2>
        <Link
          href="/transactions"
          className="-mr-2 flex min-h-11 items-center px-2 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
        >
          Lihat semua
        </Link>
      </div>
      {transactions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Belum ada transaksi.</p>
      ) : (
        <ul className="grid gap-x-6 md:grid-cols-2">
          {transactions.map((t) => {
            const s = TX_STYLE[t.type];
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-line-soft py-3">
                <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${s.tile}`}>
                  <s.Icon size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{t.category}</span>
                  <span className="truncate text-[13px] text-muted">
                    {t.pocket?.name ?? t.account?.name ?? '-'} · {tanggalPendek(t.date)}
                  </span>
                </span>
                <span className={`text-sm font-medium whitespace-nowrap ${s.amount}`}>
                  {s.sign}
                  {formatRupiah(t.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
