import type { GoldAsset, GoldBrandPrice, GoldPrices } from './types';

/** Jenis emas yang paling umum, tampil paling atas di pilihan */
export const MAIN_BRANDS = ['ANTAM', 'UBS', 'GALERI 24', 'LOTUS ARCHI', 'ANTAM MULIA RETRO', 'DINAR G24'];

export function findPrice(prices: GoldPrices | null | undefined, brand: string): GoldBrandPrice | undefined {
  return prices?.brands.find((b) => b.brand === brand.toUpperCase());
}

export interface GoldValuation {
  cost: number; // harga beli total
  sellPerGramNow: number | null;
  buybackPerGramNow: number | null;
  valueNow: number | null; // nilai buyback total = gram × buyback per gram hari ini
  profit: number | null; // valueNow − cost
  profitPercent: number | null;
}

/** Hitungan seperti kolom "otomatis" di spreadsheet */
export function valuate(asset: GoldAsset, prices: GoldPrices | null | undefined): GoldValuation {
  const cost = Math.round(asset.weightInGrams * asset.buyPrice);
  const p = findPrice(prices, asset.brand);
  const buybackPerGramNow = p?.buybackPerGram ?? null;
  const valueNow = buybackPerGramNow !== null ? Math.round(asset.weightInGrams * buybackPerGramNow) : null;
  const profit = valueNow !== null ? valueNow - cost : null;
  return {
    cost,
    sellPerGramNow: p?.sellPerGram ?? null,
    buybackPerGramNow,
    valueNow,
    profit,
    profitPercent: profit !== null && cost > 0 ? (profit / cost) * 100 : null,
  };
}

export function totals(assets: GoldAsset[], prices: GoldPrices | null | undefined) {
  let weight = 0;
  let cost = 0;
  let valueNow = 0;
  let valuedCost = 0; // modal dari catatan yang punya harga hari ini
  let unpriced = 0;
  for (const a of assets) {
    const v = valuate(a, prices);
    weight += a.weightInGrams;
    cost += v.cost;
    if (v.valueNow === null) unpriced++;
    else {
      valueNow += v.valueNow;
      valuedCost += v.cost;
    }
  }
  const profit = valueNow - valuedCost;
  return {
    weight,
    cost,
    valueNow: unpriced === assets.length ? null : valueNow,
    profit: unpriced === assets.length ? null : profit,
    profitPercent: valuedCost > 0 ? (profit / valuedCost) * 100 : null,
    unpriced,
  };
}

export function formatGram(n: number) {
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: 3 })} gram`;
}

export function formatPersen(n: number) {
  return `${n > 0 ? '+' : ''}${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}
