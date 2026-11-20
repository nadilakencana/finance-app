'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah } from '@/lib/format';
import type { Account } from '@/lib/types';
import { IconTrash } from '@/components/icons';
import { EmptyState, ErrorBox, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export default function AccountsPage() {
  const accounts = useApi<Account[]>('/account');
  // null = form tambah, Account = form ubah
  const [editing, setEditing] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  if (accounts.loading) return <Loading />;
  if (accounts.error) return <ErrorBox message={accounts.error} />;

  const list = accounts.data ?? [];
  const total = list.reduce((s, a) => s + a.balance, 0);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }

  async function handleDelete(a: Account) {
    // Transaksinya tidak ikut terhapus: Prisma mengosongkan accountId-nya (onDelete default = SetNull)
    if (!confirm(`Hapus rekening "${a.name}"? Riwayat transaksinya tetap ada, tapi tidak lagi terhubung ke rekening ini.`)) return;
    setListError(null);
    try {
      await api.delete(`/account/${a.id}`);
      accounts.reload();
    } catch (err) {
      setListError(err instanceof Error ? `Gagal menghapus: ${err.message}` : 'Gagal menghapus');
    }
  }

  return (
    <>
      <PageHeader
        title="Rekening"
        subtitle={
          <>
            Total saldo: <strong className="text-ink">{formatRupiah(total)}</strong>
          </>
        }
        backHref="/more"
        onAdd={startCreate}
        addLabel="Tambah rekening"
      />

      <ErrorBox message={listError} />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-label="Daftar rekening" className="grid min-w-0 flex-[999_1_420px] grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 md:gap-4">
          {list.length === 0 && <EmptyState>Belum ada rekening. Tambahkan rekening bank atau e-wallet pertamamu.</EmptyState>}
          {list.map((a) => (
            <article key={a.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-brand-soft font-bold text-brand">
                  {initials(a.name)}
                </div>
                <h2 className="text-[17px] font-semibold">{a.name}</h2>
              </div>
              <div>
                <div className="text-[13px] text-muted">Saldo</div>
                <div className="font-display text-2xl font-bold md:text-[26px]">{formatRupiah(a.balance)}</div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/transactions?accountId=${a.id}`}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#f0f2ee] text-sm font-semibold"
                >
                  Riwayat
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(a);
                    setOpen(true);
                  }}
                  className="min-h-11 flex-1 rounded-lg border border-[#cbd0ca] bg-surface text-sm font-semibold"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  aria-label={`Hapus ${a.name}`}
                  className="flex size-11 items-center justify-center rounded-lg border border-[#cbd0ca] bg-surface text-warn"
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </article>
          ))}
        </section>

        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing}
          open={open}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onDone={() => {
            setOpen(false);
            setEditing(null);
            accounts.reload();
          }}
        />
      </div>
    </>
  );
}

function AccountForm({
  account,
  open,
  onClose,
  onDone,
}: {
  account: Account | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(account?.name ?? '');
  const [balance, setBalance] = useState(account ? String(account.balance) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = { name, ...(balance !== '' ? { balance: Number(balance) } : {}) };
      if (account) await api.patch(`/account/${account.id}`, body);
      else await api.post('/account', body);
      setName('');
      setBalance('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel
      title={account ? `Ubah ${account.name}` : 'Tambah rekening'}
      open={open}
      desktopAlways
      highlight={!!account}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <Field label="Nama rekening">
        <input className={inputClass} required minLength={2} placeholder="mis. Bank Jago Utama" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={account ? 'Saldo' : 'Saldo awal (opsional)'}>
        <input className={inputClass} type="number" inputMode="numeric" placeholder="0" value={balance} onChange={(e) => setBalance(e.target.value)} />
      </Field>
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Menyimpan…' : account ? 'Simpan perubahan' : 'Simpan rekening'}
      </button>
      {account && (
        <button type="button" onClick={onClose} className="hidden min-h-11 text-sm font-semibold text-muted md:block">
          Batal
        </button>
      )}
    </FormPanel>
  );
}
