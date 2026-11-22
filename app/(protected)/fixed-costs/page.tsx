'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah } from '@/lib/format';
import type { FixedCost } from '@/lib/types';
import { IconCheck, IconFilter, IconLayers, IconTrash } from '@/components/icons';
import { FilterSelect, GroupHeading, ListToolbar, NoResults, SearchBox, groupItems, matchesQuery } from '@/components/list-tools';
import { BILL_CATEGORIES, billCategory } from '@/lib/categories';

const STATUS_ORDER = ['Terlambat', 'Belum lunas', 'Lunas'];
const RANGE_ORDER = ['Tanggal 1–10', 'Tanggal 11–20', 'Tanggal 21–31'];

function billStatus(b: FixedCost, today: number) {
  if (b.isPaid) return 'Lunas';
  return b.dueDate < today ? 'Terlambat' : 'Belum lunas';
}

function dueRange(day: number) {
  return day <= 10 ? RANGE_ORDER[0] : day <= 20 ? RANGE_ORDER[1] : RANGE_ORDER[2];
}
import { useConfirm, useToast } from '@/components/feedback';
import { EmptyState, ErrorBox, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

export default function FixedCostsPage() {
  const bills = useApi<FixedCost[]>('/fixed-costs');
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('due');
  const [groupBy, setGroupBy] = useState('category');
  const [today] = useState(() => new Date().getDate());

  const list = useMemo(() => bills.data ?? [], [bills.data]);
  const filtered = useMemo(() => {
    const result = list.filter(
      (b) =>
        matchesQuery(query, b.name, billCategory(b.name), b.amount) &&
        (status === 'all' || billStatus(b, today) === status) &&
        (category === 'all' || billCategory(b.name) === category),
    );
    const sorters: Record<string, (a: FixedCost, b: FixedCost) => number> = {
      due: (a, b) => a.dueDate - b.dueDate,
      amount: (a, b) => b.amount - a.amount,
      name: (a, b) => a.name.localeCompare(b.name, 'id'),
    };
    return result.sort(sorters[sort] ?? sorters.due);
  }, [list, query, status, category, sort, today]);
  const groups = useMemo((): [string, FixedCost[]][] => {
    if (groupBy === 'category') return groupItems(filtered, (b) => billCategory(b.name), [...BILL_CATEGORIES]);
    if (groupBy === 'status') return groupItems(filtered, (b) => billStatus(b, today), STATUS_ORDER);
    if (groupBy === 'range') return groupItems(filtered, (b) => dueRange(b.dueDate), RANGE_ORDER);
    return [['', filtered]];
  }, [filtered, groupBy, today]);

  if (bills.loading) return <Loading />;
  if (bills.error) return <ErrorBox message={bills.error} />;

  const filterActive = query !== '' || status !== 'all' || category !== 'all';
  function resetFilters() {
    setQuery('');
    setStatus('all');
    setCategory('all');
  }
  const total = list.reduce((s, b) => s + b.amount, 0);
  const paid = list.filter((b) => b.isPaid);
  const unpaidAmount = list.filter((b) => !b.isPaid).reduce((s, b) => s + b.amount, 0);
  const paidPercent = total > 0 ? Math.round(((total - unpaidAmount) / total) * 100) : 0;

  async function run(id: string, action: () => Promise<unknown>, successMessage?: string) {
    setBusyId(id);
    setListError(null);
    try {
      await action();
      await bills.reload();
      if (successMessage) toast(successMessage);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Gagal');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Tagihan rutin"
        subtitle="Tagihan bulanan dengan tanggal jatuh tempo. Centang kalau sudah dibayar."
        onAdd={() => setFormOpen(true)}
        addLabel="Tambah tagihan"
      />

      {/* Ringkasan: HP = satu kartu + progress bar, desktop = 3 kartu */}
      <section aria-label="Ringkasan tagihan" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 md:hidden">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Total per bulan</span>
          <span className="font-display text-xl font-medium">{formatRupiah(total)}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Tagihan lunas"
          aria-valuenow={paidPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-warn-line"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${paidPercent}%` }} />
        </div>
        <div className="flex justify-between text-[13px] font-medium">
          <span className="text-brand-dark">{paid.length} lunas</span>
          <span className="text-warn-dark">Sisa {formatRupiah(unpaidAmount)}</span>
        </div>
      </section>
      <section aria-label="Ringkasan tagihan" className="hidden grid-cols-3 gap-4 md:grid">
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-5">
          <span className="text-[13px] text-muted">Total per bulan</span>
          <span className="font-display text-2xl font-medium">{formatRupiah(total)}</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-brand-soft p-5 text-brand-dark">
          <span className="text-[13px]">Sudah lunas</span>
          <span className="font-display text-2xl font-medium">{paid.length} tagihan</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-warn-soft p-5 text-warn-dark">
          <span className="text-[13px]">Belum lunas</span>
          <span className="font-display text-2xl font-medium">{formatRupiah(unpaidAmount)}</span>
        </div>
      </section>

      <ErrorBox message={listError} />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-label="Daftar tagihan" className="flex min-w-0 flex-[999_1_420px] flex-col gap-5">
          {list.length === 0 ? (
            <EmptyState>Belum ada tagihan rutin.</EmptyState>
          ) : (
            <ListToolbar
              search={<SearchBox value={query} onChange={setQuery} placeholder="Cari tagihan" />}
              shown={filtered.length}
              total={list.length}
              noun="tagihan"
              active={filterActive}
              onReset={resetFilters}
            >
              <FilterSelect
                label="Status"
                icon={<IconFilter size={16} />}
                value={status}
                onChange={setStatus}
                options={[{ value: 'all', label: 'Semua' }, ...STATUS_ORDER.map((v) => ({ value: v, label: v }))]}
              />
              <FilterSelect
                label="Kategori"
                value={category}
                onChange={setCategory}
                options={[{ value: 'all', label: 'Semua' }, ...BILL_CATEGORIES.map((v) => ({ value: v, label: v }))]}
              />
              <FilterSelect
                label="Urutkan"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'due', label: 'Jatuh tempo' },
                  { value: 'amount', label: 'Nominal terbesar' },
                  { value: 'name', label: 'Nama A–Z' },
                ]}
              />
              <FilterSelect
                label="Kelompokkan"
                icon={<IconLayers size={16} />}
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'category', label: 'Kategori' },
                  { value: 'status', label: 'Status' },
                  { value: 'range', label: 'Tanggal jatuh tempo' },
                  { value: 'none', label: 'Tidak' },
                ]}
              />
            </ListToolbar>
          )}
          {list.length > 0 && filtered.length === 0 && <NoResults onReset={resetFilters} />}
          {groups.map(([group, items]) => (
            <div key={group || 'all'} className="flex flex-col gap-2">
              {group && <GroupHeading title={group} count={items.length} aside={formatRupiah(items.reduce((s, b) => s + b.amount, 0))} />}
              <ul className="rounded-2xl border border-line bg-surface px-4 md:px-5">
                {items.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 border-b border-line-soft py-3.5 last:border-0 md:gap-4 md:py-4">
                    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-raised md:size-13">
                      <span className="text-xs text-muted">tgl</span>
                      <span className="font-display text-lg leading-none font-medium md:text-xl">{b.dueDate}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`truncate text-[15px] font-medium ${b.isPaid ? 'line-through' : ''}`}>{b.name}</span>
                      <span className="text-[13px] text-muted">
                        {formatRupiah(b.amount)}
                        {groupBy !== 'category' && ` · ${billCategory(b.name)}`}
                        {billStatus(b, today) === 'Terlambat' && <span className="font-medium text-warn"> · Terlambat</span>}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      aria-pressed={b.isPaid}
                      aria-label={b.isPaid ? `${b.name} sudah lunas, tandai belum lunas` : `Tandai ${b.name} lunas`}
                      onClick={() => run(b.id, () => api.patch(`/fixed-costs/${b.id}/toggle-paid`))}
                      className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 text-sm font-medium disabled:opacity-60 max-md:size-11 md:px-3.5 ${
                        b.isPaid ? 'border-brand bg-brand text-white' : 'border-warn-strong bg-surface text-warn-dark'
                      }`}
                    >
                      <IconCheck size={16} className={b.isPaid ? '' : 'md:hidden'} />
                      <span className="hidden md:inline">{b.isPaid ? 'Lunas' : 'Belum lunas'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      aria-label={`Hapus ${b.name}`}
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Hapus tagihan "${b.name}"?`,
                          message: `Tagihan ${formatRupiah(b.amount)} setiap tanggal ${b.dueDate} tidak akan muncul lagi.`,
                          confirmLabel: 'Hapus tagihan',
                        });
                        if (ok) run(b.id, () => api.delete(`/fixed-costs/${b.id}`), `Tagihan "${b.name}" dihapus`);
                      }}
                      className="flex size-11 shrink-0 items-center justify-center text-warn"
                    >
                      <IconTrash size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <FixedCostForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            bills.reload();
            toast('Tagihan ditambahkan');
          }}
        />
      </div>
    </>
  );
}

function FixedCostForm({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/fixed-costs', { name, amount: Number(amount), dueDate: Number(dueDate) });
      setName('');
      setAmount('');
      setDueDate('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title="Tambah tagihan" open={open} desktopAlways onClose={onClose} onSubmit={handleSubmit}>
      <Field label="Nama tagihan">
        <input
          className={inputClass}
          required
          minLength={2}
          maxLength={60}
          placeholder="mis. Tagihan WiFi IndiHome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <div className="flex-[2_1_140px]">
          <Field label="Nominal">
            <input
              className={inputClass}
              type="number"
              inputMode="numeric"
              required
              min={1}
              placeholder="350000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex-[1_1_90px]">
          <Field label="Jatuh tempo (tgl)">
            <input
              className={inputClass}
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={31}
              placeholder="10"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>
      </div>
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Menyimpan…' : 'Simpan tagihan'}
      </button>
    </FormPanel>
  );
}
