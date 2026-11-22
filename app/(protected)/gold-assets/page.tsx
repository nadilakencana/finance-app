'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatRupiah, formatTanggal } from '@/lib/format';
import { MAIN_BRANDS, findPrice, formatGram, formatPersen, totals, valuate } from '@/lib/gold';
import type { GoldAsset, GoldAssetInput, GoldPrices } from '@/lib/types';
import { IconFilter, IconGold, IconLayers, IconPlus, IconTrash } from '@/components/icons';
import { FilterSelect, ListToolbar, NoResults, SearchBox, groupItems, matchesQuery } from '@/components/list-tools';
import { useConfirm, useToast } from '@/components/feedback';
import { EmptyState, ErrorBox, Field, FormPanel, Loading, PageHeader, inputClass, primaryButton } from '@/components/ui';

/*
 * Warna lembut per jenis emas (latar pastel + garis + badge ikon).
 * Teks utama tetap ink supaya angka terbaca jelas di atas warna apa pun.
 */
const BRAND_TONES: Record<string, { card: string; badge: string; title: string }> = {
  ANTAM: { card: 'bg-[#fbf4e4] border-[#f1e2bd]', badge: 'bg-[#f3e2b5] text-[#8a6116]', title: 'text-[#6e4d10]' },
  UBS: { card: 'bg-[#fcefee] border-[#f4d9d6]', badge: 'bg-[#f6d8d4] text-[#9a4a40]', title: 'text-[#7d3a32]' },
  'GALERI 24': { card: 'bg-[#e9f5f1] border-[#cde8df]', badge: 'bg-[#cfeadf] text-brand-dark', title: 'text-brand-dark' },
  'LOTUS ARCHI': { card: 'bg-[#f1effa] border-[#dfdaf2]', badge: 'bg-[#e0dbf4] text-[#5b4b9a]', title: 'text-[#4a3d82]' },
};
const EXTRA_TONES = [
  { card: 'bg-[#eaf2fb] border-[#d3e3f4]', badge: 'bg-[#d5e5f6] text-[#2f5f8f]', title: 'text-[#264d75]' },
  { card: 'bg-[#f3f5e8] border-[#e1e6c8]', badge: 'bg-[#e3e8c6] text-[#5f6b1f]', title: 'text-[#4d5718]' },
  { card: 'bg-[#fbf0e8] border-[#f2dccb]', badge: 'bg-[#f4dccb] text-[#93542a]', title: 'text-[#7a4421]' },
];
function brandTone(brand: string) {
  if (BRAND_TONES[brand]) return BRAND_TONES[brand];
  let h = 0;
  for (const c of brand) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return EXTRA_TONES[h % EXTRA_TONES.length];
}

const DEFAULT_GOALS = ['Dana Darurat', 'Nikah', 'Dana Nikah & Darurat', 'Investasi'];
const NO_GOAL = 'Tanpa status';

/* Warna titik status tabungan: tetap per nama, dari palet yang sudah ada */
const GOAL_DOTS = ['bg-brand', 'bg-warn', 'bg-mint', 'bg-ink-2', 'bg-warn-strong', 'bg-muted'];
function goalDot(goal: string) {
  let h = 0;
  for (const c of goal) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GOAL_DOTS[h % GOAL_DOTS.length];
}

function GoalChip({ goal }: { goal: string | null }) {
  if (!goal) return <span className="text-muted">-</span>;
  return (
    <span title={goal} className="inline-flex max-w-36 items-center gap-1.5 rounded-md bg-raised px-2 py-1 text-[13px] whitespace-nowrap">
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${goalDot(goal)}`} />
      <span className="truncate">{goal}</span>
    </span>
  );
}

function Money({ value, signed }: { value: number | null; signed?: boolean }) {
  if (value === null) return <span className="text-muted">-</span>;
  if (!signed) return <>{formatRupiah(value)}</>;
  const tone = value > 0 ? 'text-brand' : value < 0 ? 'text-warn' : '';
  return (
    <span className={tone}>
      {value > 0 ? '+ ' : value < 0 ? '− ' : ''}
      {formatRupiah(Math.abs(value))}
    </span>
  );
}

type Panel = { kind: 'create' } | { kind: 'edit'; asset: GoldAsset } | null;

export default function GoldAssetsPage() {
  const assets = useApi<GoldAsset[]>('/gold-assets');
  const [pricePath, setPricePath] = useState('/gold-prices');
  const prices = useApi<GoldPrices>(pricePath);
  const [panel, setPanel] = useState<Panel>(null);
  const [listError, setListError] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();
  const [mobileLimit, setMobileLimit] = useState(20);

  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [goalFilter, setGoalFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [sort, setSort] = useState('oldest');
  const [groupBy, setGroupBy] = useState('none');

  const p = prices.data;
  const list = useMemo(() => assets.data ?? [], [assets.data]);
  const years = useMemo(() => [...new Set(list.map((a) => a.purchaseDate.slice(0, 4)))].sort().reverse(), [list]);

  const rows = useMemo(() => {
    const result = list.filter(
      (g) =>
        matchesQuery(query, g.brand, g.store, g.serialNumber, g.goal, formatTanggal(g.purchaseDate), g.weightInGrams) &&
        (brandFilter === 'all' || g.brand === brandFilter) &&
        (goalFilter === 'all' || (goalFilter === NO_GOAL ? !g.goal : g.goal === goalFilter)) &&
        (yearFilter === 'all' || g.purchaseDate.startsWith(yearFilter)) &&
        (storeFilter === 'all' || (g.store ?? '') === storeFilter),
    );
    const profitOf = (g: GoldAsset) => valuate(g, p).profit ?? -Infinity;
    const sorters: Record<string, (a: GoldAsset, b: GoldAsset) => number> = {
      // Default lama -> baru, seperti spreadsheet (No 1 = pembelian pertama)
      oldest: (a, b) => a.purchaseDate.localeCompare(b.purchaseDate),
      newest: (a, b) => b.purchaseDate.localeCompare(a.purchaseDate),
      weight: (a, b) => b.weightInGrams - a.weightInGrams,
      profit: (a, b) => profitOf(b) - profitOf(a),
    };
    return result.sort(sorters[sort] ?? sorters.oldest);
  }, [list, query, brandFilter, goalFilter, yearFilter, storeFilter, sort, p]);

  const groups = useMemo((): [string, GoldAsset[]][] => {
    switch (groupBy) {
      case 'goal':
        return groupItems(rows, (g) => g.goal ?? NO_GOAL).sort(([a], [b]) =>
          a === NO_GOAL ? 1 : b === NO_GOAL ? -1 : a.localeCompare(b, 'id'),
        );
      case 'brand':
        return groupItems(rows, (g) => g.brand, MAIN_BRANDS);
      case 'year':
        return groupItems(rows, (g) => g.purchaseDate.slice(0, 4)).sort(([a], [b]) => b.localeCompare(a));
      case 'store':
        return groupItems(rows, (g) => g.store ?? 'Tanpa toko').sort(([a], [b]) => a.localeCompare(b, 'id'));
      default:
        return [['', rows]];
    }
  }, [rows, groupBy]);

  if (assets.loading) return <Loading />;
  if (assets.error) return <ErrorBox message={assets.error} />;

  const t = totals(list, p);
  const filterActive = query !== '' || brandFilter !== 'all' || goalFilter !== 'all' || yearFilter !== 'all' || storeFilter !== 'all';
  // Baris total di tabel mengikuti hasil filter; kartu ringkasan di atas tetap total keseluruhan
  const shownTotals = filterActive ? totals(rows, p) : t;
  function resetFilters() {
    setQuery('');
    setBrandFilter('all');
    setGoalFilter('all');
    setYearFilter('all');
    setStoreFilter('all');
  }
  const stores = [...new Set(list.map((a) => a.store).filter((s): s is string => !!s))];
  const goals = [...new Set([...DEFAULT_GOALS, ...list.map((a) => a.goal).filter((g): g is string => !!g)])];
  const ownedBrands = [...new Set(list.map((a) => a.brand))];
  const usedGoals = [...new Set(list.map((a) => a.goal).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b, 'id'));

  // HP: daftar datar berisi judul grup + kartu, dipotong per 20 kartu
  type MobileItem = { kind: 'group'; title: string; count: number; profit: number | null } | { kind: 'asset'; asset: GoldAsset };
  const mobileItems: MobileItem[] = [];
  let shownCards = 0;
  for (const [group, items] of groups) {
    if (shownCards >= mobileLimit) break;
    if (group) mobileItems.push({ kind: 'group', title: group, count: items.length, profit: totals(items, p).profit });
    for (const asset of items) {
      if (shownCards >= mobileLimit) break;
      mobileItems.push({ kind: 'asset', asset });
      shownCards++;
    }
  }
  const priceBrands = [...new Set(['ANTAM', 'UBS', ...ownedBrands])];

  async function handleDelete(g: GoldAsset) {
    const ok = await confirm({
      title: 'Hapus catatan pembelian?',
      message: `${formatGram(g.weightInGrams)} ${g.brand}, dibeli ${formatTanggal(g.purchaseDate)} seharga ${formatRupiah(Math.round(g.weightInGrams * g.buyPrice))}.`,
      confirmLabel: 'Hapus catatan',
    });
    if (!ok) return;
    setListError(null);
    try {
      await api.delete(`/gold-assets/${g.id}`);
      if (panel?.kind === 'edit' && panel.asset.id === g.id) setPanel(null);
      assets.reload();
      toast('Catatan pembelian emas dihapus');
    } catch (err) {
      toast(err instanceof Error ? `Gagal menghapus: ${err.message}` : 'Gagal menghapus', 'error');
    }
  }

  function refreshPrices() {
    // Query berbeda -> useApi memuat ulang; backend membatasi ambil ulang maks. tiap 5 menit
    setPricePath(`/gold-prices?refresh=1&t=${Date.now()}`);
  }

  return (
    <>
      <PageHeader
        title="Emas"
        subtitle="Nilai buyback dihitung dari harga hari ini"
        backHref="/more"
        onAdd={() => setPanel({ kind: 'create' })}
        addLabel="Catat pembelian"
        action={
          <button
            type="button"
            onClick={() => setPanel({ kind: 'create' })}
            className="hidden min-h-11 items-center gap-2 rounded-lg bg-brand px-4 font-medium text-white transition-colors hover:bg-brand-dark md:inline-flex"
          >
            <IconPlus size={20} />
            Catat pembelian
          </button>
        }
      />

      {/* Ringkasan */}
      <section aria-label="Ringkasan tabungan emas" className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-1.5 rounded-2xl bg-ink p-5 text-white lg:col-span-1">
          <span className="text-[13px] text-on-ink-muted">Total berat</span>
          <span className="font-display text-[28px] leading-none font-semibold">{formatGram(t.weight)}</span>
          <span className="text-[13px] text-on-ink-muted">{list.length} kali beli</span>
        </div>
        <SummaryCard label="Total harga beli" value={formatRupiah(t.cost)} />
        <SummaryCard label="Nilai buyback sekarang" value={t.valueNow === null ? '-' : formatRupiah(t.valueNow)} />
        <div className="col-span-2 flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 md:p-5 lg:col-span-1">
          <span className="text-[13px] text-muted">Untung / rugi</span>
          <span className="font-display text-lg font-medium md:text-2xl">
            <Money value={t.profit} signed />
          </span>
          {t.profitPercent !== null && <span className="text-[13px] text-muted">{formatPersen(t.profitPercent)} dari harga beli</span>}
        </div>
      </section>

      {/* Harga hari ini */}
      <section aria-labelledby="h-harga" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 id="h-harga" className="font-display text-lg font-medium">
              Harga hari ini
            </h2>
            {p && (
              <span className="text-[13px] text-muted">
                Sumber{' '}
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-line-strong underline-offset-2 hover:text-ink"
                >
                  {p.source}
                </a>
                {findPrice(p, 'ANTAM')?.updatedAt && <> · diperbarui {findPrice(p, 'ANTAM')?.updatedAt}</>}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={refreshPrices}
            disabled={prices.loading}
            className="min-h-11 rounded-lg border border-line-strong px-4 text-sm font-medium transition-colors hover:bg-raised disabled:opacity-60"
          >
            {prices.loading ? 'Memuat…' : 'Perbarui harga'}
          </button>
        </div>
        {prices.error && <ErrorBox message={`Harga emas tidak bisa dimuat: ${prices.error}. Nilai buyback belum bisa dihitung.`} />}
        {p?.stale && (
          <p role="status" className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-sm text-warn-dark">
            Situs sumber sedang tidak bisa diakses. Ini harga terakhir yang berhasil diambil.
          </p>
        )}
        {p && (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {priceBrands.map((b) => {
              const bp = findPrice(p, b);
              const tone = brandTone(b);
              return (
                <li key={b} className={`flex flex-col gap-3 rounded-xl border p-4 ${tone.card}`}>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={`flex size-8 items-center justify-center rounded-lg ${tone.badge}`}>
                      <IconGold size={16} />
                    </span>
                    <span className={`text-sm font-medium ${tone.title}`}>{b}</span>
                  </div>
                  {bp ? (
                    <dl className="flex flex-col gap-1.5 text-[13px]">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted">Jual / gram</dt>
                        <dd className="text-[15px] font-medium">{bp.sellPerGram ? formatRupiah(bp.sellPerGram) : '-'}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-muted">Buyback / gram</dt>
                        <dd className="text-[15px] font-medium">{bp.buybackPerGram ? formatRupiah(bp.buybackPerGram) : '-'}</dd>
                      </div>
                    </dl>
                  ) : (
                    <span className="text-[13px] text-muted">Tidak ada di daftar harga {p.source}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ErrorBox message={listError} />

      <div className="flex flex-wrap items-start gap-4">
        <section aria-labelledby="h-riwayat" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
          <h2 id="h-riwayat" className="font-display text-lg font-medium md:text-xl">
            Tabungan emas
          </h2>
          {list.length > 0 && (
            <ListToolbar
              search={<SearchBox value={query} onChange={setQuery} placeholder="Cari toko, no. seri, status" />}
              shown={rows.length}
              total={list.length}
              noun="pembelian"
              active={filterActive}
              onReset={resetFilters}
            >
              <FilterSelect
                label="Jenis"
                icon={<IconFilter size={16} />}
                value={brandFilter}
                onChange={setBrandFilter}
                options={[{ value: 'all', label: 'Semua' }, ...ownedBrands.map((b) => ({ value: b, label: b }))]}
              />
              <FilterSelect
                label="Status"
                value={goalFilter}
                onChange={setGoalFilter}
                options={[
                  { value: 'all', label: 'Semua' },
                  ...usedGoals.map((g) => ({ value: g, label: g })),
                  { value: NO_GOAL, label: NO_GOAL },
                ]}
              />
              <FilterSelect
                label="Tahun"
                value={yearFilter}
                onChange={setYearFilter}
                options={[{ value: 'all', label: 'Semua' }, ...years.map((y) => ({ value: y, label: y }))]}
              />
              <FilterSelect
                label="Toko"
                value={storeFilter}
                onChange={setStoreFilter}
                options={[{ value: 'all', label: 'Semua' }, ...stores.map((st) => ({ value: st, label: st }))]}
              />
              <FilterSelect
                label="Urutkan"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'oldest', label: 'Tanggal lama–baru' },
                  { value: 'newest', label: 'Tanggal terbaru' },
                  { value: 'weight', label: 'Gram terbesar' },
                  { value: 'profit', label: 'Untung terbesar' },
                ]}
              />
              <FilterSelect
                label="Kelompokkan"
                icon={<IconLayers size={16} />}
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'none', label: 'Tidak' },
                  { value: 'goal', label: 'Status tabungan' },
                  { value: 'brand', label: 'Jenis emas' },
                  { value: 'year', label: 'Tahun beli' },
                  { value: 'store', label: 'Toko' },
                ]}
              />
            </ListToolbar>
          )}
          {list.length === 0 ? (
            <EmptyState>Belum ada catatan pembelian emas.</EmptyState>
          ) : rows.length === 0 ? (
            <NoResults onReset={resetFilters} />
          ) : (
            <>
              {/* Desktop: tabel seperti spreadsheet, geser ke samping kalau sempit */}
              <div className="hidden max-h-[640px] overflow-auto rounded-2xl border border-line bg-surface md:block">
                <table className="w-full min-w-[1040px] border-collapse text-[13px]">
                  <thead className="sticky top-0 z-10 bg-surface">
                    <tr className="text-left align-bottom text-xs text-muted">
                      {[
                        ['No', 'w-10'],
                        ['Tanggal beli · toko', ''],
                        ['Jenis · no. seri', ''],
                        ['Gram', 'text-right'],
                        ['Harga beli (total)', 'text-right'],
                        ['Harga / gram saat ini', 'text-right'],
                        ['Buyback / gram saat beli', 'text-right'],
                        ['Buyback / gram saat ini', 'text-right'],
                        ['Nilai buyback total', 'text-right'],
                        ['Untung / rugi', 'text-right'],
                        ['Status tabungan', ''],
                      ].map(([label, cls]) => (
                        <th key={label} scope="col" className={`border-b border-line px-2 py-3 font-medium ${cls}`}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {groups.map(([group, items], gi) => {
                    const offset = groups.slice(0, gi).reduce((n, [, list]) => n + list.length, 0);
                    const sub = group ? totals(items, p) : null;
                    return (
                      <tbody key={group || 'all'}>
                        {sub && (
                          <tr className="bg-raised text-[15px] font-semibold text-ink">
                            <th scope="rowgroup" colSpan={3} className="border-b border-line px-2 py-2.5 text-left">
                              {group}
                              <span className="ml-2 text-[13px] font-normal text-muted">{items.length} pembelian</span>
                            </th>
                            <td className="border-b border-line px-2 py-2.5 text-right whitespace-nowrap">
                              {sub.weight.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                            </td>
                            <td className="border-b border-line px-2 py-2.5 text-right whitespace-nowrap">{formatRupiah(sub.cost)}</td>
                            <td colSpan={3} className="border-b border-line" />
                            <td className="border-b border-line px-2 py-2.5 text-right whitespace-nowrap">
                              <Money value={sub.valueNow} />
                            </td>
                            <td className="border-b border-line px-2 py-2.5 text-right whitespace-nowrap">
                              <Money value={sub.profit} signed />
                            </td>
                            <td className="border-b border-line px-2 py-2.5 text-xs font-normal text-muted">
                              {sub.profitPercent !== null && formatPersen(sub.profitPercent)}
                            </td>
                          </tr>
                        )}
                        {items.map((g, i) => {
                          const v = valuate(g, p);
                          const editing = panel?.kind === 'edit' && panel.asset.id === g.id;
                          const td = 'border-b border-line-soft px-2 py-2.5';
                          return (
                            <tr
                              key={g.id}
                              onClick={() => setPanel({ kind: 'edit', asset: g })}
                              className={`cursor-pointer transition-colors hover:bg-canvas ${editing ? 'bg-brand-soft hover:bg-brand-soft' : ''}`}
                            >
                              <td className={`${td} text-muted`}>{offset + i + 1}</td>
                              <td className={`${td} max-w-36`}>
                                <button
                                  type="button"
                                  aria-label={`Ubah pembelian ${formatGram(g.weightInGrams)} ${g.brand} tanggal ${formatTanggal(g.purchaseDate)}`}
                                  className="whitespace-nowrap hover:underline"
                                >
                                  {formatTanggal(g.purchaseDate)}
                                </button>
                                <div className="truncate text-xs text-muted" title={g.store ?? undefined}>
                                  {g.store ?? '-'}
                                </div>
                              </td>
                              <td className={`${td} max-w-36`}>
                                <div className="truncate">{g.brand}</div>
                                <div className="truncate text-xs text-muted">{g.serialNumber || '-'}</div>
                              </td>
                              <td className={`${td} text-right`}>
                                {g.weightInGrams.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                              </td>
                              <td className={`${td} text-right font-medium whitespace-nowrap`}>{formatRupiah(v.cost)}</td>
                              <td className={`${td} text-right whitespace-nowrap`}>
                                <Money value={v.sellPerGramNow} />
                              </td>
                              <td className={`${td} text-right whitespace-nowrap`}>
                                <Money value={g.buybackPriceAtPurchase} />
                              </td>
                              <td className={`${td} text-right whitespace-nowrap`}>
                                <Money value={v.buybackPerGramNow} />
                              </td>
                              <td className={`${td} text-right font-medium whitespace-nowrap`}>
                                <Money value={v.valueNow} />
                              </td>
                              <td className={`${td} text-right font-medium whitespace-nowrap`}>
                                <Money value={v.profit} signed />
                              </td>
                              <td className={td}>
                                <GoalChip goal={g.goal} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })}
                  {/* Baris total: tebal + latar hijau lembut, garis hijau di atasnya (inset shadow karena border hilang di sel sticky) */}
                  <tfoot className="sticky bottom-0 bg-brand-soft text-sm font-bold text-ink shadow-[inset_0_2px_0_var(--color-brand)]">
                    <tr>
                      <td colSpan={3} className="px-2 py-3.5 text-brand-dark">
                        {filterActive ? `Total ${rows.length} hasil filter` : 'Total'}
                      </td>
                      <td className="px-2 py-3.5 text-right whitespace-nowrap">
                        {shownTotals.weight.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-2 py-3.5 text-right whitespace-nowrap">{formatRupiah(shownTotals.cost)}</td>
                      <td colSpan={3} />
                      <td className="px-2 py-3.5 text-right whitespace-nowrap">
                        <Money value={shownTotals.valueNow} />
                      </td>
                      <td className="px-2 py-3.5 text-right whitespace-nowrap">
                        <Money value={shownTotals.profit} signed />
                      </td>
                      <td className="px-2 py-3.5 text-xs font-normal text-muted">
                        {shownTotals.unpriced > 0 && `${shownTotals.unpriced} catatan tanpa harga hari ini`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* HP: kartu per pembelian */}
              <ul className="flex flex-col gap-3 md:hidden">
                {mobileItems.map((item) => {
                  if (item.kind === 'group') {
                    return (
                      <li key={`group-${item.title}`} className="flex items-baseline justify-between gap-3 px-1 pt-2">
                        <span className="text-lg font-semibold">
                          {item.title}
                          <span className="ml-2 text-sm font-normal text-muted">{item.count}</span>
                        </span>
                        <span className="text-base font-semibold">
                          <Money value={item.profit} signed />
                        </span>
                      </li>
                    );
                  }
                  const g = item.asset;
                  const v = valuate(g, p);
                  return (
                    <li key={g.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-medium">
                            {formatGram(g.weightInGrams)} · {g.brand}
                          </span>
                          <span className="truncate text-[13px] text-muted">
                            {formatTanggal(g.purchaseDate)}
                            {g.store && ` · ${g.store}`}
                            {g.serialNumber && ` · ${g.serialNumber}`}
                          </span>
                        </div>
                        <GoalChip goal={g.goal} />
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-raised p-3 text-[13px]">
                        <div>
                          <dt className="text-muted">Harga beli</dt>
                          <dd className="text-[15px] font-medium">{formatRupiah(v.cost)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Nilai buyback</dt>
                          <dd className="text-[15px] font-medium">
                            <Money value={v.valueNow} />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Untung / rugi</dt>
                          <dd className="text-[15px] font-medium">
                            <Money value={v.profit} signed />
                            {v.profitPercent !== null && (
                              <span className="ml-1 text-xs font-normal text-muted">{formatPersen(v.profitPercent)}</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Buyback / gram</dt>
                          <dd className="text-[15px]">
                            <Money value={v.buybackPerGramNow} />
                          </dd>
                        </div>
                      </dl>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPanel({ kind: 'edit', asset: g })}
                          className="min-h-11 flex-1 rounded-lg border border-line-strong text-sm font-medium transition-colors hover:bg-raised"
                        >
                          Ubah
                        </button>
                        <DeleteButton label={`Hapus pembelian ${formatTanggal(g.purchaseDate)}`} onClick={() => handleDelete(g)} />
                      </div>
                    </li>
                  );
                })}
                {rows.length > mobileLimit && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setMobileLimit((n) => n + 20)}
                      className="min-h-11 w-full rounded-lg border border-line-strong bg-surface text-sm font-medium transition-colors hover:bg-raised"
                    >
                      Tampilkan lebih banyak ({rows.length - mobileLimit} lagi)
                    </button>
                  </li>
                )}
                <li className="flex items-center justify-between rounded-2xl border-2 border-brand bg-brand-soft p-4 text-sm font-bold">
                  <span>
                    {filterActive ? 'Total hasil filter' : 'Total'} {formatGram(shownTotals.weight)}
                  </span>
                  <Money value={shownTotals.profit} signed />
                </li>
              </ul>
            </>
          )}
        </section>

        {panel && (
          <GoldForm
            key={panel.kind === 'edit' ? panel.asset.id : 'new'}
            asset={panel.kind === 'edit' ? panel.asset : null}
            prices={p}
            stores={stores}
            goals={goals}
            onClose={() => setPanel(null)}
            onDelete={panel.kind === 'edit' ? () => handleDelete(panel.asset) : undefined}
            onDone={() => {
              toast(panel.kind === 'edit' ? 'Perubahan disimpan' : 'Pembelian emas dicatat');
              setPanel(null);
              assets.reload();
            }}
          />
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-full flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 md:p-5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-display text-lg font-medium md:text-2xl">{value}</span>
    </div>
  );
}

function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg text-warn transition-colors hover:bg-warn-soft size-11`}
    >
      <IconTrash size={16} />
    </button>
  );
}

const toDateInput = (iso: string) => iso.slice(0, 10);

function GoldForm({
  asset,
  prices,
  stores,
  goals,
  onClose,
  onDelete,
  onDone,
}: {
  asset: GoldAsset | null;
  prices: GoldPrices | null;
  stores: string[];
  goals: string[];
  onClose: () => void;
  onDelete?: () => void;
  onDone: () => void;
}) {
  const [brand, setBrand] = useState(asset?.brand ?? 'ANTAM');
  const [weight, setWeight] = useState(asset ? String(asset.weightInGrams) : '');
  const [total, setTotal] = useState(asset ? String(Math.round(asset.weightInGrams * asset.buyPrice)) : '');
  const [date, setDate] = useState(asset ? toDateInput(asset.purchaseDate) : '');
  const [store, setStore] = useState(asset?.store ?? '');
  const [serial, setSerial] = useState(asset?.serialNumber ?? '');
  const [buybackAtBuy, setBuybackAtBuy] = useState(asset?.buybackPriceAtPurchase ? String(asset.buybackPriceAtPurchase) : '');
  const [goal, setGoal] = useState(asset?.goal ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const brandOptions = [...new Set([...MAIN_BRANDS, ...(prices?.brands.map((b) => b.brand) ?? []), brand])];
  const current = findPrice(prices, brand);
  const w = Number(weight);
  const tot = Number(total);
  const perGram = w > 0 && tot > 0 ? tot / w : null;
  const valueNow = w > 0 && current?.buybackPerGram ? Math.round(w * current.buybackPerGram) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!perGram) return;
    setError(null);
    setSaving(true);
    const body: GoldAssetInput = {
      weightInGrams: w,
      buyPrice: perGram,
      brand,
      ...(date ? { purchaseDate: date } : {}),
      // Saat mengubah, kolom yang dikosongkan dikirim null supaya ikut terhapus
      store: store.trim() || (asset ? null : undefined),
      serialNumber: serial.trim() || (asset ? null : undefined),
      buybackPriceAtPurchase: buybackAtBuy ? Number(buybackAtBuy) : asset ? null : undefined,
      goal: goal.trim() || (asset ? null : undefined),
    };
    try {
      if (asset) await api.patch(`/gold-assets/${asset.id}`, body);
      else await api.post('/gold-assets', body);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPanel title={asset ? 'Ubah pembelian' : 'Catat pembelian'} open highlight onClose={onClose} onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jenis emas">
          <select className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)}>
            {brandOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Berat (gram)">
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            step="0.001"
            required
            min={0.001}
            placeholder="1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Harga beli (total)">
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          required
          min={1}
          placeholder="2509000"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
      </Field>
      <Field label="Tanggal beli">
        <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Toko (opsional)">
          <input
            className={inputClass}
            list="gold-stores"
            maxLength={80}
            placeholder="Sinar Fajar"
            value={store}
            onChange={(e) => setStore(e.target.value)}
          />
        </Field>
        <Field label="No. seri (opsional)">
          <input className={inputClass} maxLength={40} placeholder="ABC123" value={serial} onChange={(e) => setSerial(e.target.value)} />
        </Field>
      </div>
      <datalist id="gold-stores">
        {stores.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Field label="Buyback per gram saat beli (opsional)">
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="2321000"
          value={buybackAtBuy}
          onChange={(e) => setBuybackAtBuy(e.target.value)}
        />
      </Field>
      {current?.buybackPerGram && !buybackAtBuy && (
        <button
          type="button"
          onClick={() => setBuybackAtBuy(String(current.buybackPerGram))}
          className="-mt-2 self-start text-[13px] font-medium text-brand hover:text-brand-dark"
        >
          Pakai buyback hari ini ({formatRupiah(current.buybackPerGram)})
        </button>
      )}
      <Field label="Status tabungan (opsional)">
        <input className={inputClass} list="gold-goals" maxLength={60} placeholder="Dana Darurat" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </Field>
      <datalist id="gold-goals">
        {goals.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {perGram && (
        <dl className="grid grid-cols-2 gap-2 rounded-lg bg-raised px-3.5 py-3 text-[13px]">
          <div>
            <dt className="text-muted">Harga beli / gram</dt>
            <dd className="font-medium">{formatRupiah(Math.round(perGram))}</dd>
          </div>
          <div>
            <dt className="text-muted">Nilai buyback hari ini</dt>
            <dd className="font-medium">{valueNow === null ? '-' : formatRupiah(valueNow)}</dd>
          </div>
          {valueNow !== null && (
            <div className="col-span-2">
              <dt className="text-muted">Untung / rugi kalau dijual hari ini</dt>
              <dd className="font-medium">
                <Money value={valueNow - tot} signed />
              </dd>
            </div>
          )}
        </dl>
      )}
      <ErrorBox message={error} />
      <button disabled={saving} className={primaryButton}>
        {saving ? 'Menyimpan…' : asset ? 'Simpan perubahan' : 'Simpan'}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium text-warn transition-colors hover:bg-warn-soft"
        >
          <IconTrash size={16} />
          Hapus pembelian ini
        </button>
      )}
    </FormPanel>
  );
}
