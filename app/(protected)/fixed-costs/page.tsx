'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah } from '@/lib/format';
import type { FixedCost } from '@/lib/types';
import { IconCheck, IconTrash } from '@/components/icons';
import { EmptyState, ErrorBox, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

export default function FixedCostsPage() {
  const bills = useApi<FixedCost[]>('/fixed-costs');
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  if (bills.loading) return <Loading />;
  if (bills.error) return <ErrorBox message={bills.error} />;

  const list = bills.data ?? [];
  const total = list.reduce((s, b) => s + b.amount, 0);
  const paid = list.filter((b) => b.isPaid);
  const unpaidAmount = list.filter((b) => !b.isPaid).reduce((s, b) => s + b.amount, 0);
  const paidPercent = total > 0 ? Math.round(((total - unpaidAmount) / total) * 100) : 0;

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setListError(null);
    try {
      await action();
      await bills.reload();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Gagal');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Tagihan Rutin"
        subtitle="Tagihan bulanan dengan tanggal jatuh tempo. Centang kalau sudah dibayar."
        onAdd={() => setFormOpen(true)}
        addLabel="Tambah tagihan"
      />

      {/* Ringkasan: HP = satu kartu + progress bar, desktop = 3 kartu */}
      <section aria-label="Ringkasan tagihan" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 md:hidden">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Total per bulan</span>
          <span className="font-display text-xl font-bold">{formatRupiah(total)}</span>
        </div>
        <div role="progressbar" aria-label="Tagihan lunas" aria-valuenow={paidPercent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-[#f1d9bf]">
          <div className="h-full rounded-full bg-brand" style={{ width: `${paidPercent}%` }} />
        </div>
        <div className="flex justify-between text-[13px] font-semibold">
          <span className="text-brand-dark">{paid.length} lunas</span>
          <span className="text-warn-dark">Sisa {formatRupiah(unpaidAmount)}</span>
        </div>
      </section>
      <section aria-label="Ringkasan tagihan" className="hidden grid-cols-3 gap-4 md:grid">
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-[18px]">
          <span className="text-[13px] text-muted">Total per bulan</span>
          <span className="font-display text-2xl font-bold">{formatRupiah(total)}</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-brand-soft p-[18px] text-brand-dark">
          <span className="text-[13px]">Sudah lunas</span>
          <span className="font-display text-2xl font-bold">{paid.length} tagihan</span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-warn-soft p-[18px] text-warn-dark">
          <span className="text-[13px]">Belum lunas</span>
          <span className="font-display text-2xl font-bold">{formatRupiah(unpaidAmount)}</span>
        </div>
      </section>

      <ErrorBox message={listError} />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-label="Daftar tagihan" className="min-w-0 flex-[999_1_420px]">
          {list.length === 0 ? (
            <EmptyState>Belum ada tagihan rutin.</EmptyState>
          ) : (
            <ul className="rounded-2xl border border-line bg-surface px-4 md:px-5">
              {list.map((b) => (
                <li key={b.id} className="flex items-center gap-3 border-b border-[#eef0ec] py-3.5 last:border-0 md:gap-4 md:py-4">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#f0f2ee] md:size-13">
                    <span className="text-[10px] text-muted">tgl</span>
                    <span className="font-display text-[17px] leading-none font-bold md:text-xl">{b.dueDate}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`truncate text-[15px] font-semibold ${b.isPaid ? 'line-through' : ''}`}>{b.name}</span>
                    <span className="text-[13px] text-muted">{formatRupiah(b.amount)}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    aria-pressed={b.isPaid}
                    aria-label={b.isPaid ? `${b.name} sudah lunas, tandai belum lunas` : `Tandai ${b.name} lunas`}
                    onClick={() => run(b.id, () => api.patch(`/fixed-costs/${b.id}/toggle-paid`))}
                    className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 text-sm font-semibold disabled:opacity-60 max-md:size-11 md:px-3.5 ${
                      b.isPaid ? 'border-brand bg-brand text-white' : 'border-[#e2b98f] bg-surface text-warn-dark'
                    }`}
                  >
                    <IconCheck size={16} className={b.isPaid ? '' : 'md:hidden'} />
                    <span className="hidden md:inline">{b.isPaid ? 'Lunas' : 'Belum lunas'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    aria-label={`Hapus ${b.name}`}
                    onClick={() => {
                      if (confirm(`Hapus tagihan "${b.name}"?`)) run(b.id, () => api.delete(`/fixed-costs/${b.id}`));
                    }}
                    className="flex size-11 shrink-0 items-center justify-center text-warn"
                  >
                    <IconTrash size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <FixedCostForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            bills.reload();
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
        <input className={inputClass} required minLength={2} placeholder="mis. Tagihan WiFi IndiHome" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <div className="flex-[2_1_140px]">
          <Field label="Nominal">
            <input className={inputClass} type="number" inputMode="numeric" required min={1} placeholder="350000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </div>
        <div className="flex-[1_1_90px]">
          <Field label="Jatuh tempo (tgl)">
            <input className={inputClass} type="number" inputMode="numeric" required min={1} max={31} placeholder="10" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
