'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah } from '@/lib/format';
import type { Account } from '@/lib/types';
import { IconFilter, IconLayers, IconTrash } from '@/components/icons';
import { FilterSelect, GroupHeading, ListToolbar, NoResults, SearchBox, groupItems, matchesQuery } from '@/components/list-tools';
import { ACCOUNT_KINDS, accountKind } from '@/lib/categories';
import { useConfirm, useToast } from '@/components/feedback';
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
  const confirm = useConfirm();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [groupBy, setGroupBy] = useState('kind');

  const list = useMemo(() => accounts.data ?? [], [accounts.data]);
  const filtered = useMemo(() => {
    const result = list.filter(
      (a) =>
        matchesQuery(query, a.name, accountKind(a.name)) &&
        (kind === 'all' || accountKind(a.name) === kind) &&
        (balanceFilter === 'all' || (balanceFilter === 'filled' ? a.balance > 0 : a.balance <= 0)),
    );
    return result.sort((a, b) =>
      sort === 'high' ? b.balance - a.balance : sort === 'low' ? a.balance - b.balance : a.name.localeCompare(b.name, 'id'),
    );
  }, [list, query, kind, balanceFilter, sort]);
  const groups = useMemo(
    () =>
      groupBy === 'kind' ? groupItems(filtered, (a) => accountKind(a.name), [...ACCOUNT_KINDS]) : [['', filtered] as [string, Account[]]],
    [filtered, groupBy],
  );

  if (accounts.loading) return <Loading />;
  if (accounts.error) return <ErrorBox message={accounts.error} />;

  const total = list.reduce((s, a) => s + a.balance, 0);
  const filterActive = query !== '' || kind !== 'all' || balanceFilter !== 'all';
  function resetFilters() {
    setQuery('');
    setKind('all');
    setBalanceFilter('all');
  }

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }

  async function handleDelete(a: Account) {
    // Transaksinya tidak ikut terhapus: Prisma mengosongkan accountId-nya (onDelete default = SetNull)
    const ok = await confirm({
      title: `Hapus rekening "${a.name}"?`,
      message: 'Riwayat transaksinya tetap ada, tapi tidak lagi terhubung ke rekening ini.',
      confirmLabel: 'Hapus rekening',
    });
    if (!ok) return;
    setListError(null);
    try {
      await api.delete(`/account/${a.id}`);
      accounts.reload();
      toast(`Rekening "${a.name}" dihapus`);
    } catch (err) {
      toast(err instanceof Error ? `Gagal menghapus: ${err.message}` : 'Gagal menghapus', 'error');
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
        <section aria-label="Daftar rekening" className="flex min-w-0 flex-[999_1_420px] flex-col gap-5">
          {list.length === 0 ? (
            <EmptyState>Belum ada rekening. Tambahkan rekening bank atau e-wallet pertamamu.</EmptyState>
          ) : (
            <ListToolbar
              search={<SearchBox value={query} onChange={setQuery} placeholder="Cari rekening" />}
              shown={filtered.length}
              total={list.length}
              noun="rekening"
              active={filterActive}
              onReset={resetFilters}
            >
              <FilterSelect
                label="Jenis"
                icon={<IconFilter size={16} />}
                value={kind}
                onChange={setKind}
                options={[{ value: 'all', label: 'Semua' }, ...ACCOUNT_KINDS.map((k) => ({ value: k, label: k }))]}
              />
              <FilterSelect
                label="Saldo"
                value={balanceFilter}
                onChange={setBalanceFilter}
                options={[
                  { value: 'all', label: 'Semua' },
                  { value: 'filled', label: 'Ada saldo' },
                  { value: 'empty', label: 'Kosong' },
                ]}
              />
              <FilterSelect
                label="Urutkan"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'name', label: 'Nama A–Z' },
                  { value: 'high', label: 'Saldo terbesar' },
                  { value: 'low', label: 'Saldo terkecil' },
                ]}
              />
              <FilterSelect
                label="Kelompokkan"
                icon={<IconLayers size={16} />}
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'kind', label: 'Jenis' },
                  { value: 'none', label: 'Tidak' },
                ]}
              />
            </ListToolbar>
          )}
          {list.length > 0 && filtered.length === 0 && <NoResults onReset={resetFilters} />}
          {groups.map(([group, items]) => (
            <div key={group || 'all'} className="flex flex-col gap-3">
              {group && <GroupHeading title={group} count={items.length} aside={formatRupiah(items.reduce((s, a) => s + a.balance, 0))} />}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 md:gap-4">
                {items.map((a) => (
                  <article key={a.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:p-5">
                    <div className="flex items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="flex size-11 items-center justify-center rounded-xl bg-raised font-medium text-ink-2"
                      >
                        {initials(a.name)}
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <h2 className="truncate text-lg font-medium">{a.name}</h2>
                        <span className="text-xs text-muted">{accountKind(a.name)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] text-muted">Saldo</div>
                      <div className="font-display text-2xl font-medium md:text-2xl">{formatRupiah(a.balance)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/transactions?accountId=${a.id}`}
                        className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-raised text-sm font-medium"
                      >
                        Riwayat
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(a);
                          setOpen(true);
                        }}
                        className="min-h-11 flex-1 rounded-lg border border-line-strong bg-surface text-sm font-medium"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
                        aria-label={`Hapus ${a.name}`}
                        className="flex size-11 items-center justify-center rounded-lg border border-line-strong bg-surface text-warn"
                      >
                        <IconTrash size={20} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
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
            toast(editing ? 'Perubahan rekening disimpan' : 'Rekening ditambahkan');
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
      const body = {
        name,
        ...(balance !== '' ? { balance: Number(balance) } : {}),
      };
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
        <input
          className={inputClass}
          required
          minLength={2}
          maxLength={60}
          placeholder="mis. Bank Jago Utama"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label={account ? 'Saldo' : 'Saldo awal (opsional)'}>
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
      </Field>
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Menyimpan…' : account ? 'Simpan perubahan' : 'Simpan rekening'}
      </button>
      {account && (
        <button type="button" onClick={onClose} className="hidden min-h-11 text-sm font-medium text-muted md:block">
          Batal
        </button>
      )}
    </FormPanel>
  );
}
