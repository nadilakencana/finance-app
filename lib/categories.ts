/**
 * Kategori turunan untuk data yang belum punya kolom kategori di database (rekening, tagihan).
 * Ditebak dari nama. Kalau nanti backend punya kolom `type`/`category`, cukup ganti fungsi ini.
 */
import { normalize } from '@/components/list-tools';

const has = (name: string, words: string[]) => words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(name));

/* ---------- Rekening ---------- */
export const ACCOUNT_KINDS = ['Bank', 'Bank digital', 'Dompet digital', 'Tunai', 'Lainnya'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export function accountKind(rawName: string): AccountKind {
  const name = normalize(rawName);
  if (has(name, ['gopay', 'ovo', 'shopeepay', 'flip', 'linkaja', 'sakuku', 'doku', 'isaku', 'astrapay'])) return 'Dompet digital';
  if (has(name, ['jago', 'seabank', 'jenius', 'blu', 'allo', 'line bank', 'neo', 'neobank', 'krom', 'digibank', 'superbank', 'raya'])) return 'Bank digital';
  if (has(name, ['bca', 'mandiri', 'bri', 'bni', 'cimb', 'cimb niaga', 'permata', 'bsi', 'btn', 'danamon', 'ocbc', 'maybank', 'panin', 'mega', 'bank'])) return 'Bank';
  if (has(name, ['dana'])) return 'Dompet digital';
  if (has(name, ['tunai', 'cash', 'dompet', 'uang kas'])) return 'Tunai';
  return 'Lainnya';
}

/* ---------- Tagihan rutin ---------- */
export const BILL_CATEGORIES = [
  'Hunian & utilitas',
  'Internet & pulsa',
  'Langganan digital',
  'Asuransi & kesehatan',
  'Cicilan',
  'Keluarga & sosial',
  'Gaya hidup',
  'Lainnya',
] as const;
export type BillCategory = (typeof BILL_CATEGORIES)[number];

export function billCategory(rawName: string): BillCategory {
  const name = normalize(rawName);
  if (has(name, ['sewa', 'kos', 'kost', 'kontrakan', 'listrik', 'pln', 'air', 'pdam', 'iuran', 'ipl', 'gas', 'sampah'])) return 'Hunian & utilitas';
  if (has(name, ['wifi', 'indihome', 'internet', 'paket data', 'pulsa', 'biznet', 'first media', 'myrepublic', 'telkomsel'])) return 'Internet & pulsa';
  if (has(name, ['netflix', 'spotify', 'youtube', 'youtube premium', 'icloud', 'google one', 'disney', 'prime', 'vidio', 'chatgpt', 'canva', 'langganan'])) return 'Langganan digital';
  if (has(name, ['bpjs', 'asuransi', 'kesehatan'])) return 'Asuransi & kesehatan';
  if (has(name, ['cicilan', 'kredit', 'kpr', 'paylater', 'pinjaman'])) return 'Cicilan';
  if (has(name, ['orang tua', 'adik', 'kakak', 'sekolah', 'arisan', 'zakat', 'sedekah', 'keluarga'])) return 'Keluarga & sosial';
  if (has(name, ['gym', 'laundry', 'fitness', 'salon'])) return 'Gaya hidup';
  return 'Lainnya';
}

/* ---------- Kantong ---------- */
export const POCKET_STATUSES = ['Tercapai', 'Hampir tercapai', 'Berjalan', 'Belum diisi'] as const;
export type PocketStatus = (typeof POCKET_STATUSES)[number];

export function pocketStatus(current: number, target: number): PocketStatus {
  if (current <= 0) return 'Belum diisi';
  if (target > 0 && current >= target) return 'Tercapai';
  if (target > 0 && current / target >= 0.75) return 'Hampir tercapai';
  return 'Berjalan';
}
