'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah, formatRupiahSingkat, formatTanggal } from '@/lib/format';
import type { Account, CreateTransactionInput, Pocket, Transaction, TransactionType } from '@/lib/types';
import { IconFilter, IconLayers } from '@/components/icons';
import { FilterSelect, GroupHeading, ListToolbar, NoResults, SearchBox, groupItems, matchesQuery } from '@/components/list-tools';
import { useToast } from '@/components/feedback';
import { EmptyState, ErrorBox, Fab, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

const TYPE_LABEL: Record<TransactionType, string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
  TRANSFER_TO_POCKET: 'Transfer ke kantong',
};

const AMOUNT_COLOR: Record<TransactionType, string> = {
  INCOME: 'text-brand',
  EXPENSE: 'text-warn',
  TRANSFER_TO_POCKET: 'text-ink',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signedAmount(t: Transaction) {
  const sign = t.type === 'INCOME' ? '+ ' : t.type === 'EXPENSE' ? '− ' : '';
  return sign + formatRupiah(t.amount);
}

function sourceLabel(t: Transaction) {
  if (t.type === 'TRANSFER_TO_POCKET') return `${t.account?.name ?? '-'} → ${t.pocket?.name ?? '-'}`;
  return t.pocket?.name ?? t.account?.name ?? '-';
}

/** Rentang tanggal [mulai, akhir) untuk filter periode */
function periodRange(period: string): [number, number] | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'thisMonth':
      return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()];
    case 'lastMonth':
      return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()];
    case '30d':
      return [now.getTime() - 30 * 86_400_000, Infinity];
    case 'thisYear':
      return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()];
    default:
      return null;
  }
}

const monthLabel = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Selisih bersih sebuah grup: pemasukan − pengeluaran (transfer tidak dihitung) */
function netOf(items: Transaction[]) {
  return items.reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : t.type === 'EXPENSE' ? -t.amount : 0), 0);
}

function formatNet(n: number, format: (n: number) => string = formatRupiah) {
  return `${n > 0 ? '+ ' : n < 0 ? '− ' : ''}${format(Math.abs(n))}`;
}

export function TransactionsClient({ initialAccountId }: { initialAccountId: string | null }) {
  // Nilai dari URL tidak dipercaya mentah-mentah: hanya UUID yang dipakai sebagai filter
  const safeInitial = initialAccountId && UUID.test(initialAccountId) ? `account:${initialAccountId}` : 'all';

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [source, setSource] = useState(safeInitial);
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState('all');
  const [groupBy, setGroupBy] = useState('day');
  const [formOpen, setFormOpen] = useState(false);
  const toast = useToast();

  const transactions = useApi<Transaction[]>('/transactions');
  const accounts = useApi<Account[]>('/account');
  const pockets = useApi<Pocket[]>('/pockets');

  const list = useMemo(() => transactions.data ?? [], [transactions.data]);
  const categories = useMemo(() => [...new Set(list.map((t) => t.category))].sort((a, b) => a.localeCompare(b, 'id')), [list]);

  const filtered = useMemo(() => {
    const range = periodRange(period);
    const [sourceKind, sourceId] = source.split(':');
    return list.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (sourceKind === 'account' && t.accountId !== sourceId) return false;
      if (sourceKind === 'pocket' && t.pocketId !== sourceId) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (range) {
        const time = new Date(t.date).getTime();
        if (time < range[0] || time >= range[1]) return false;
      }
      return matchesQuery(query, t.category, t.description, t.account?.name, t.pocket?.name, TYPE_LABEL[t.type], t.amount);
    });
  }, [list, query, type, source, category, period]);

  const groups = useMemo((): [string, Transaction[]][] => {
    switch (groupBy) {
      case 'day':
        return groupItems(filtered, (t) => dayLabel(t.date));
      case 'month':
        return groupItems(filtered, (t) => monthLabel(t.date));
      case 'category':
        return groupItems(filtered, (t) => t.category).sort((a, b) => netOf(a[1]) - netOf(b[1]));
      case 'source':
        return groupItems(filtered, sourceLabel).sort((a, b) => a[0].localeCompare(b[0], 'id'));
      case 'type':
        return groupItems(filtered, (t) => TYPE_LABEL[t.type], Object.values(TYPE_LABEL));
      default:
        return [['', filtered]];
    }
  }, [filtered, groupBy]);

  const income = filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  const filterActive = query !== '' || type !== 'all' || source !== 'all' || category !== 'all' || period !== 'all';
  function resetFilters() {
    setQuery('');
    setType('all');
    setSource('all');
    setCategory('all');
    setPeriod('all');
  }

  return (
    <>
      <PageHeader title="Transaksi" subtitle="Semua pemasukan, pengeluaran, dan transfer ke kantong" />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-label="Riwayat transaksi" className="flex min-w-0 flex-[999_1_460px] flex-col gap-4">
          {list.length > 0 && (
            <ListToolbar
              search={<SearchBox value={query} onChange={setQuery} placeholder="Cari kategori, catatan, nominal" />}
              shown={filtered.length}
              total={list.length}
              noun="transaksi"
              active={filterActive}
              onReset={resetFilters}
            >
              <FilterSelect
                label="Jenis"
                icon={<IconFilter size={16} />}
                value={type}
                onChange={setType}
                options={[{ value: 'all', label: 'Semua' }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))]}
              />
              <FilterSelect
                label="Periode"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: 'all', label: 'Semua' },
                  { value: 'thisMonth', label: 'Bulan ini' },
                  { value: 'lastMonth', label: 'Bulan lalu' },
                  { value: '30d', label: '30 hari terakhir' },
                  { value: 'thisYear', label: 'Tahun ini' },
                ]}
              />
              <FilterSelect
                label="Kategori"
                value={category}
                onChange={setCategory}
                options={[{ value: 'all', label: 'Semua' }, ...categories.map((c) => ({ value: c, label: c }))]}
              />
              <FilterSelect
                label="Sumber"
                value={source}
                onChange={setSource}
                options={[
                  { value: 'all', label: 'Semua' },
                  ...(accounts.data ?? []).map((a) => ({ value: `account:${a.id}`, label: a.name })),
                  ...(pockets.data ?? []).map((p) => ({ value: `pocket:${p.id}`, label: p.name })),
                ]}
              />
              <FilterSelect
                label="Kelompokkan"
                icon={<IconLayers size={16} />}
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'day', label: 'Tanggal' },
                  { value: 'month', label: 'Bulan' },
                  { value: 'category', label: 'Kategori' },
                  { value: 'source', label: 'Sumber' },
                  { value: 'type', label: 'Jenis' },
                  { value: 'none', label: 'Tidak' },
                ]}
              />
            </ListToolbar>
          )}

          {transactions.loading && <Loading />}
          <ErrorBox message={transactions.error} />
          {!transactions.loading && list.length === 0 && <EmptyState>Belum ada transaksi.</EmptyState>}
          {list.length > 0 && filtered.length === 0 && <NoResults onReset={resetFilters} />}

          {filtered.length > 0 && (
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-surface p-4 text-sm md:gap-4 md:px-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">Pemasukan</span>
                <span className="font-semibold text-brand">{formatRupiahSingkat(income)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">Pengeluaran</span>
                <span className="font-semibold text-warn">{formatRupiahSingkat(expense)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">Selisih</span>
                <span className="font-semibold">{formatNet(income - expense, formatRupiahSingkat)}</span>
              </div>
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {/* Desktop: satu tabel, grup jadi baris pemisah */}
              <TransactionTable groups={groups} hideDate={groupBy === 'day'} />

              {/* HP: kartu per grup */}
              <div className="flex flex-col gap-4 md:hidden">
                {groups.map(([group, items]) =>
                  items.length === 0 ? null : (
                    <div key={group || 'all'} className="flex flex-col gap-2">
                      {group && <GroupHeading title={group} count={items.length} aside={formatNet(netOf(items))} />}
                      <TransactionCards items={items} hideDate={groupBy === 'day'} />
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </section>

        <TransactionForm
          open={formOpen}
          accounts={accounts.data ?? []}
          pockets={pockets.data ?? []}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            toast('Transaksi dicatat');
            transactions.reload();
            accounts.reload();
            pockets.reload();
          }}
        />
      </div>

      <Fab onClick={() => setFormOpen(true)} label="Catat transaksi" />
    </>
  );
}

function TransactionTable({ groups, hideDate }: { groups: [string, Transaction[]][]; hideDate: boolean }) {
  const columns: [string, string][] = [
    ...(hideDate ? [] : ([['Tanggal', 'w-36']] as [string, string][])),
    ['Kategori', 'w-[20%]'],
    ['Keterangan', ''],
    ['Sumber', 'w-[22%]'],
    ['Jumlah', 'w-40 text-right'],
  ];
  return (
    <div className="hidden max-h-[70vh] overflow-auto rounded-2xl border border-line bg-surface md:block">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-[15px]">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="text-left text-[13px] text-muted">
            {columns.map(([label, cls]) => (
              <th key={label} scope="col" className={`px-4 py-3 font-medium shadow-[inset_0_-1px_0_var(--color-line)] ${cls}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map(([group, items]) =>
          items.length === 0 ? null : (
            <tbody key={group || 'all'}>
              {group && (
                <tr className="bg-raised">
                  <th scope="rowgroup" colSpan={columns.length - 1} className="border-b border-line px-4 py-2.5 text-left font-semibold">
                    {group}
                    <span className="ml-2 text-[13px] font-normal text-muted">{items.length} transaksi</span>
                  </th>
                  <td className="border-b border-line px-4 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">
                    {formatNet(netOf(items))}
                  </td>
                </tr>
              )}
              {items.map((t) => (
                <tr key={t.id} className="border-b border-line-soft transition-colors last:border-line hover:bg-canvas">
                  {!hideDate && <td className="px-4 py-3 whitespace-nowrap text-muted">{formatTanggal(t.date)}</td>}
                  <td className="truncate px-4 py-3 font-medium" title={t.category}>
                    {t.category}
                  </td>
                  <td className="truncate px-4 py-3 text-ink-2" title={t.description ?? undefined}>
                    {t.description || <span className="text-muted">–</span>}
                  </td>
                  <td className="truncate px-4 py-3 text-ink-2" title={sourceLabel(t)}>
                    {sourceLabel(t)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums ${AMOUNT_COLOR[t.type]}`}>
                    {signedAmount(t)}
                  </td>
                </tr>
              ))}
            </tbody>
          ),
        )}
      </table>
    </div>
  );
}

function TransactionCards({ items, hideDate }: { items: Transaction[]; hideDate: boolean }) {
  return (
    <ul className="rounded-2xl border border-line bg-surface px-4">
      {items.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-2 border-b border-line-soft py-3.5 last:border-0">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-medium">{t.category}</span>
            <span className="truncate text-xs text-muted">
              {sourceLabel(t)}
              {!hideDate && ` · ${formatTanggal(t.date)}`}
            </span>
          </div>
          <span className={`text-[15px] font-medium whitespace-nowrap ${AMOUNT_COLOR[t.type]}`}>{signedAmount(t)}</span>
        </li>
      ))}
    </ul>
  );
}

function TransactionForm({
  open,
  accounts,
  pockets,
  categories,
  onClose,
  onDone,
}: {
  open: boolean;
  accounts: Account[];
  pockets: Pocket[];
  categories: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  // value berbentuk "account:<id>" atau "pocket:<id>"
  const [source, setSource] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pemasukan hanya boleh ke rekening; kalau sumber terpilih kantong, anggap belum memilih
  const effectiveSource = type === 'INCOME' && source.startsWith('pocket:') ? '' : source;
  const fallbackSource = accounts[0] ? `account:${accounts[0].id}` : '';
  const selectedSource = effectiveSource || fallbackSource;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const [kind, id] = selectedSource.split(':');
    if (!id) {
      setError('Tambahkan rekening dulu di halaman Rekening.');
      return;
    }
    const body: CreateTransactionInput = {
      type,
      amount: Number(amount),
      category,
      ...(kind === 'account' ? { accountId: id } : { pocketId: id }),
      ...(date ? { date } : {}),
      ...(description ? { description } : {}),
    };
    setSaving(true);
    try {
      await api.post('/transactions', body);
      setAmount('');
      setCategory('');
      setDescription('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title="Catat transaksi" open={open} desktopAlways onClose={onClose} onSubmit={handleSubmit}>
      <div role="radiogroup" aria-label="Tipe" className="flex gap-1 rounded-xl bg-raised p-1">
        {(['INCOME', 'EXPENSE'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`min-h-11 flex-1 rounded-lg font-medium ${type === t ? 'bg-surface' : ''}`}
          >
            {t === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>
      <Field label="Nominal">
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          required
          min={1}
          placeholder="25000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Kategori">
        <input
          className={inputClass}
          required
          maxLength={60}
          list="transaction-categories"
          placeholder="mis. Makan"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <datalist id="transaction-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label={type === 'INCOME' ? 'Masuk ke rekening' : 'Bayar dari'}>
        <select className={inputClass} value={selectedSource} onChange={(e) => setSource(e.target.value)}>
          {accounts.length === 0 && <option value="">Belum ada rekening</option>}
          <optgroup label="Rekening">
            {accounts.map((a) => (
              <option key={a.id} value={`account:${a.id}`}>
                {a.name} — {formatRupiah(a.balance)}
              </option>
            ))}
          </optgroup>
          {type === 'EXPENSE' && pockets.length > 0 && (
            <optgroup label="Kantong">
              {pockets.map((p) => (
                <option key={p.id} value={`pocket:${p.id}`}>
                  {p.name} — {formatRupiah(p.currentAmount)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </Field>
      <div className="flex flex-wrap gap-3">
        <div className="flex-[1_1_130px]">
          <Field label="Tanggal">
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex-[2_1_160px]">
          <Field label="Catatan">
            <input
              className={inputClass}
              maxLength={200}
              placeholder="Opsional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
      </div>
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Menyimpan…' : 'Simpan'}
      </button>
    </FormPanel>
  );
}
