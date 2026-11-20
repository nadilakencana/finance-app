'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah } from '@/lib/format';
import type { Account, Pocket, TopupPocketInput } from '@/lib/types';
import { IconPlus, IconTrash } from '@/components/icons';
import { EmptyState, ErrorBox, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

type Panel = { kind: 'create' } | { kind: 'topup'; pocket: Pocket } | null;

function percent(p: Pocket) {
  return p.targetAmount > 0 ? Math.round((p.currentAmount / p.targetAmount) * 100) : 0;
}

export default function PocketsPage() {
  const pockets = useApi<Pocket[]>('/pockets');
  const accounts = useApi<Account[]>('/account');
  const [panel, setPanel] = useState<Panel>(null);
  const [listError, setListError] = useState<string | null>(null);

  if (pockets.loading) return <Loading />;
  if (pockets.error) return <ErrorBox message={pockets.error} />;

  const list = pockets.data ?? [];
  const total = list.reduce((s, p) => s + p.currentAmount, 0);
  const close = () => setPanel(null);

  async function handleDelete(p: Pocket) {
    if (!confirm(`Hapus kantong "${p.name}"?`)) return;
    setListError(null);
    try {
      await api.delete(`/pockets/${p.id}`);
      if (panel?.kind === 'topup' && panel.pocket.id === p.id) close();
      pockets.reload();
    } catch (err) {
      setListError(err instanceof Error ? `Gagal menghapus: ${err.message}` : 'Gagal menghapus');
    }
  }

  return (
    <>
      <PageHeader
        title="Kantong"
        subtitle={
          <>
            Total di semua kantong: <strong className="text-ink">{formatRupiah(total)}</strong>
          </>
        }
        onAdd={() => setPanel({ kind: 'create' })}
        addLabel="Kantong baru"
        action={
          <button
            type="button"
            onClick={() => setPanel({ kind: 'create' })}
            className="hidden min-h-11 items-center gap-2 rounded-lg border border-[#cbd0ca] bg-surface px-4 font-semibold md:inline-flex"
          >
            <IconPlus size={18} />
            Kantong baru
          </button>
        }
      />

      <ErrorBox message={listError} />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-label="Daftar kantong" className="grid min-w-0 flex-[999_1_420px] grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 md:gap-4">
          {list.length === 0 && <EmptyState>Belum ada kantong. Buat kantong pertamamu, misalnya &quot;Kantong Makan&quot;.</EmptyState>}
          {list.map((p) => {
            const pct = percent(p);
            const selected = panel?.kind === 'topup' && panel.pocket.id === p.id;
            return (
              <article
                key={p.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-surface p-4 md:gap-3.5 md:p-5 ${selected ? 'border-brand' : 'border-line'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-bold text-brand md:size-11">
                      {p.emoji || p.name.replace(/^Kantong /i, '').charAt(0).toUpperCase()}
                    </div>
                    <h2 className="truncate text-base font-semibold md:text-[17px]">{p.name}</h2>
                  </div>
                  {pct >= 100 ? (
                    <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">Target tercapai</span>
                  ) : (
                    <button type="button" onClick={() => handleDelete(p)} aria-label={`Hapus ${p.name}`} className="-mr-2 flex size-11 shrink-0 items-center justify-center text-muted hover:text-warn">
                      <IconTrash size={18} />
                    </button>
                  )}
                </div>
                <div>
                  <div className="font-display text-xl font-bold md:text-2xl">{formatRupiah(p.currentAmount)}</div>
                  <div className="text-[13px] text-muted">dari target {formatRupiah(p.targetAmount)}</div>
                </div>
                <div role="progressbar" aria-label={`Progres ${p.name}`} aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted">{pct}%</span>
                  <button
                    type="button"
                    onClick={() => setPanel({ kind: 'topup', pocket: p })}
                    className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
                  >
                    Isi kantong
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {panel?.kind === 'create' && (
          <CreatePocketForm
            onClose={close}
            onDone={() => {
              close();
              pockets.reload();
            }}
          />
        )}
        {panel?.kind === 'topup' && (
          <TopupForm
            key={panel.pocket.id}
            pocket={panel.pocket}
            accounts={accounts.data ?? []}
            onClose={close}
            onDone={() => {
              close();
              pockets.reload();
              accounts.reload();
            }}
          />
        )}
      </div>
    </>
  );
}

function CreatePocketForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [emoji, setEmoji] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/pockets', { name, targetAmount: Number(targetAmount), ...(emoji ? { emoji } : {}) });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title="Kantong baru" open highlight onClose={onClose} onSubmit={handleSubmit}>
      <Field label="Nama kantong">
        <input className={inputClass} required minLength={2} placeholder="mis. Kantong Makan" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Target dana">
        <input className={inputClass} type="number" inputMode="numeric" required min={1} placeholder="1500000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
      </Field>
      <Field label="Emoji (opsional)">
        <input className={inputClass} maxLength={4} placeholder="🍔" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
      </Field>
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Menyimpan…' : 'Buat kantong'}
      </button>
    </FormPanel>
  );
}

const QUICK_AMOUNTS = [100_000, 250_000, 500_000];

function TopupForm({
  pocket,
  accounts,
  onClose,
  onDone,
}: {
  pocket: Pocket;
  accounts: Account[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedAccountId = accountId || accounts[0]?.id || '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedAccountId) {
      setError('Tambahkan rekening dulu di halaman Rekening.');
      return;
    }
    setSaving(true);
    try {
      const body: TopupPocketInput = {
        accountId: selectedAccountId,
        amount: Number(amount),
        ...(description ? { description } : {}),
      };
      await api.post(`/pockets/${pocket.id}/topup`, body);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title={`Isi ${pocket.name}`} open highlight onClose={onClose} onSubmit={handleSubmit}>
      <p className="text-sm text-muted">Saldo rekening berkurang, saldo kantong bertambah. Tercatat sebagai transaksi transfer.</p>
      <Field label="Ambil dari rekening">
        <select className={inputClass} value={selectedAccountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.length === 0 && <option value="">Belum ada rekening</option>}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {formatRupiah(a.balance)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nominal">
        <input className={inputClass} type="number" inputMode="numeric" required min={1} placeholder="500000" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((n) => (
          <button key={n} type="button" onClick={() => setAmount(String(n))} className="min-h-10 rounded-full border border-[#cbd0ca] bg-surface px-3.5 text-sm">
            {n / 1000} rb
          </button>
        ))}
      </div>
      <Field label="Catatan (opsional)">
        <input className={inputClass} placeholder="Isi kantong minggu ini" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Memproses…' : 'Pindahkan dana'}
      </button>
    </FormPanel>
  );
}
