'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah, formatTanggal } from '@/lib/format';
import type { Account, CreateTransactionInput, Pocket, Transaction, TransactionType } from '@/lib/types';
import { IconClose } from '@/components/icons';
import { EmptyState, ErrorBox, Fab, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

const FILTERS: { id: TransactionType | null; label: string }[] = [
  { id: null, label: 'Semua' },
  { id: 'INCOME', label: 'Pemasukan' },
  { id: 'EXPENSE', label: 'Pengeluaran' },
  { id: 'TRANSFER_TO_POCKET', label: 'Transfer ke kantong' },
];

const AMOUNT_COLOR: Record<TransactionType, string> = {
  INCOME: 'text-brand',
  EXPENSE: 'text-warn',
  TRANSFER_TO_POCKET: 'text-ink',
};

function signedAmount(t: Transaction) {
  const sign = t.type === 'INCOME' ? '+ ' : t.type === 'EXPENSE' ? '− ' : '';
  return sign + formatRupiah(t.amount);
}

function sourceLabel(t: Transaction) {
  if (t.type === 'TRANSFER_TO_POCKET') return `${t.account?.name ?? '-'} → ${t.pocket?.name ?? '-'}`;
  return t.pocket?.name ?? t.account?.name ?? '-';
}

export function TransactionsClient({ initialAccountId }: { initialAccountId: string | null }) {
  const [type, setType] = useState<TransactionType | null>(null);
  const [accountId, setAccountId] = useState<string | null>(initialAccountId);
  const [formOpen, setFormOpen] = useState(false);

  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (accountId) params.set('accountId', accountId);
  const query = params.toString();

  const transactions = useApi<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
  const accounts = useApi<Account[]>('/account');
  const pockets = useApi<Pocket[]>('/pockets');

  const filteredAccount = accounts.data?.find((a) => a.id === accountId);
  const list = transactions.data ?? [];

  return (
    <>
      <PageHeader title="Transaksi" subtitle="Semua pemasukan, pengeluaran, dan transfer ke kantong." />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-label="Riwayat transaksi" className="flex min-w-0 flex-[999_1_460px] flex-col gap-4">
          <div role="group" aria-label="Filter tipe" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 md:mx-0 md:flex-wrap md:px-0">
            {FILTERS.map((f) => {
              const active = f.id === type;
              return (
                <button
                  key={f.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setType(f.id)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                    active ? 'border-ink bg-ink text-white' : 'border-[#cbd0ca] bg-surface'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
            {filteredAccount && (
              <button
                type="button"
                onClick={() => setAccountId(null)}
                aria-label={`Hapus filter rekening ${filteredAccount.name}`}
                className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-4 text-sm font-semibold text-brand-dark"
              >
                {filteredAccount.name}
                <IconClose size={14} />
              </button>
            )}
          </div>

          {transactions.loading && <Loading />}
          <ErrorBox message={transactions.error} />
          {!transactions.loading && list.length === 0 && <EmptyState>Belum ada transaksi.</EmptyState>}

          {list.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface px-4 md:p-5">
              {/* Desktop: tabel */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[520px] border-collapse text-[15px]">
                  <thead>
                    <tr className="text-left text-[13px] text-muted">
                      <th scope="col" className="border-b border-line px-2 py-2.5 font-semibold">Tanggal</th>
                      <th scope="col" className="border-b border-line px-2 py-2.5 font-semibold">Kategori</th>
                      <th scope="col" className="border-b border-line px-2 py-2.5 font-semibold">Sumber</th>
                      <th scope="col" className="border-b border-line px-2 py-2.5 text-right font-semibold">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((t) => (
                      <tr key={t.id}>
                        <td className="border-b border-[#eef0ec] px-2 py-3.5 whitespace-nowrap text-muted">{formatTanggal(t.date)}</td>
                        <td className="border-b border-[#eef0ec] px-2 py-3.5">
                          <div className="font-semibold">{t.category}</div>
                          {t.description && <div className="text-[13px] text-muted">{t.description}</div>}
                        </td>
                        <td className="border-b border-[#eef0ec] px-2 py-3.5">{sourceLabel(t)}</td>
                        <td className={`border-b border-[#eef0ec] px-2 py-3.5 text-right font-bold whitespace-nowrap ${AMOUNT_COLOR[t.type]}`}>
                          {signedAmount(t)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HP: list ringkas */}
              <ul className="md:hidden">
                {list.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 border-b border-[#eef0ec] py-3.5 last:border-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{t.category}</span>
                      <span className="truncate text-xs text-muted">
                        {sourceLabel(t)} · {formatTanggal(t.date)}
                      </span>
                    </div>
                    <span className={`text-[15px] font-bold whitespace-nowrap ${AMOUNT_COLOR[t.type]}`}>{signedAmount(t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <TransactionForm
          open={formOpen}
          accounts={accounts.data ?? []}
          pockets={pockets.data ?? []}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
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

function TransactionForm({
  open,
  accounts,
  pockets,
  onClose,
  onDone,
}: {
  open: boolean;
  accounts: Account[];
  pockets: Pocket[];
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
      <div role="radiogroup" aria-label="Tipe" className="flex gap-1 rounded-xl bg-[#e9ebe6] p-1">
        {(['INCOME', 'EXPENSE'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`min-h-11 flex-1 rounded-[9px] font-semibold ${type === t ? 'bg-surface' : ''}`}
          >
            {t === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>
      <Field label="Nominal">
        <input className={inputClass} type="number" inputMode="numeric" required min={1} placeholder="25000" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Kategori">
        <input className={inputClass} required placeholder="mis. Makan Siang" value={category} onChange={(e) => setCategory(e.target.value)} />
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
            <input className={inputClass} placeholder="Opsional" value={description} onChange={(e) => setDescription(e.target.value)} />
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
