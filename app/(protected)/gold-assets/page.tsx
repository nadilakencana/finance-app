'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah, formatTanggal } from '@/lib/format';
import type { GoldAsset, GoldAssetSummary } from '@/lib/types';
import { IconTrash } from '@/components/icons';
import { EmptyState, ErrorBox, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

function formatGram(n: number) {
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: 3 })} gram`;
}

export default function GoldAssetsPage() {
  const assets = useApi<GoldAsset[]>('/gold-assets');
  const summary = useApi<GoldAssetSummary>('/gold-assets/summary');
  const [formOpen, setFormOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  if (assets.loading || summary.loading) return <Loading />;
  if (assets.error) return <ErrorBox message={assets.error} />;

  const list = assets.data ?? [];
  const s = summary.data;

  function reloadAll() {
    assets.reload();
    summary.reload();
  }

  async function handleDelete(g: GoldAsset) {
    if (!confirm(`Hapus catatan pembelian ${formatGram(g.weightInGrams)} tanggal ${formatTanggal(g.purchaseDate)}?`)) return;
    setListError(null);
    try {
      await api.delete(`/gold-assets/${g.id}`);
      reloadAll();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  }

  return (
    <>
      <PageHeader
        title="Emas"
        subtitle="Catatan setiap pembelian emas: berat dan harga beli per gram."
        backHref="/more"
        onAdd={() => setFormOpen(true)}
        addLabel="Catat pembelian"
      />

      {s && (
        <section aria-label="Ringkasan portofolio" className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-1.5 rounded-2xl bg-ink p-[18px] text-white lg:col-span-1">
            <span className="text-[13px] text-[#b9c0c6]">Total berat</span>
            <span className="font-display text-[28px] font-bold">{formatGram(s.totalWeightGrams)}</span>
          </div>
          <SummaryCard label="Total modal" value={formatRupiah(s.totalInvestment)} />
          <SummaryCard label="Rata-rata harga / gram" value={formatRupiah(s.avgBuyPrice)} />
          <div className="hidden lg:block">
            <SummaryCard label="Jumlah pembelian" value={`${s.totalRecords} kali`} />
          </div>
        </section>
      )}

      <ErrorBox message={listError} />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-labelledby="h-riwayat" className="flex min-w-0 flex-[999_1_420px] flex-col gap-3">
          <h2 id="h-riwayat" className="font-display text-lg font-semibold md:text-xl">
            Riwayat pembelian
          </h2>
          {list.length === 0 ? (
            <EmptyState>Belum ada catatan pembelian emas.</EmptyState>
          ) : (
            <div className="rounded-2xl border border-line bg-surface px-4 md:p-5">
              {/* Desktop: tabel */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[480px] border-collapse text-[15px]">
                  <thead>
                    <tr className="text-left text-[13px] text-muted">
                      <th scope="col" className="border-b border-line px-2 py-2.5 font-semibold">Tanggal beli</th>
                      <th scope="col" className="border-b border-line px-2 py-2.5 text-right font-semibold">Berat</th>
                      <th scope="col" className="border-b border-line px-2 py-2.5 text-right font-semibold">Harga / gram</th>
                      <th scope="col" className="border-b border-line px-2 py-2.5 text-right font-semibold">Total</th>
                      <th scope="col" className="border-b border-line px-2 py-2.5">
                        <span className="sr-only">Aksi</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((g) => (
                      <tr key={g.id}>
                        <td className="border-b border-[#eef0ec] px-2 py-3.5">{formatTanggal(g.purchaseDate)}</td>
                        <td className="border-b border-[#eef0ec] px-2 py-3.5 text-right font-semibold">{formatGram(g.weightInGrams)}</td>
                        <td className="border-b border-[#eef0ec] px-2 py-3.5 text-right">{formatRupiah(g.buyPrice)}</td>
                        <td className="border-b border-[#eef0ec] px-2 py-3.5 text-right font-semibold">{formatRupiah(g.weightInGrams * g.buyPrice)}</td>
                        <td className="border-b border-[#eef0ec] px-2 py-1.5 text-right">
                          <DeleteButton label={`Hapus pembelian ${formatTanggal(g.purchaseDate)}`} onClick={() => handleDelete(g)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HP: list ringkas */}
              <ul className="md:hidden">
                {list.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 border-b border-[#eef0ec] py-3 last:border-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">
                        {formatGram(g.weightInGrams)} · {formatRupiah(g.buyPrice)}/g
                      </span>
                      <span className="text-xs text-muted">{formatTanggal(g.purchaseDate)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[15px] font-bold whitespace-nowrap">{formatRupiah(g.weightInGrams * g.buyPrice)}</span>
                      <DeleteButton label={`Hapus pembelian ${formatTanggal(g.purchaseDate)}`} onClick={() => handleDelete(g)} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <GoldForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            reloadAll();
          }}
        />
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-full flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 md:p-[18px]">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-display text-lg font-bold md:text-2xl">{value}</span>
    </div>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inline-flex size-11 items-center justify-center text-warn">
      <IconTrash size={18} />
    </button>
  );
}

function GoldForm({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/gold-assets', {
        weightInGrams: Number(weight),
        buyPrice: Number(price),
        ...(date ? { purchaseDate: date } : {}),
      });
      setWeight('');
      setPrice('');
      setDate('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title="Catat pembelian" open={open} desktopAlways onClose={onClose} onSubmit={handleSubmit}>
      <Field label="Berat (gram)">
        <input className={inputClass} type="number" inputMode="decimal" step="0.001" required min={0.001} placeholder="2.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </Field>
      <Field label="Harga beli per gram">
        <input className={inputClass} type="number" inputMode="numeric" required min={1} placeholder="1050000" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field label="Tanggal beli (opsional)">
        <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      {weight && price && (
        <p className="rounded-lg bg-[#f0f2ee] px-3.5 py-3 text-sm">
          Total: <strong>{formatRupiah(Number(weight) * Number(price))}</strong>
        </p>
      )}
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Menyimpan…' : 'Simpan'}
      </button>
    </FormPanel>
  );
}
