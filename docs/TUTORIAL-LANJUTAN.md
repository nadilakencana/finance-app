# Tutorial Lanjutan — Frontend "Kantong" (finance-app)

> Dibuat 15 November 2026 supaya kamu bisa lanjut dari titik terakhir.
> Baca **Bagian 0** dulu (5 menit), lalu ikuti **Bagian 5** langkah demi langkah.
> Semua kode di sini sudah dites: lolos `tsc`, `eslint`, dan `next build` di Next.js 16.2.3.

> **Update 20 November 2026: semua langkah sudah dikerjakan di repo.** Semua halaman (desktop + mobile) sudah ada dan sudah dites ke backend sungguhan. Sekarang dokumen ini berfungsi sebagai **penjelasan** kode. Kalau ada perbedaan, **file di repo yang benar**. Lihat Bagian 8 untuk ringkasan apa saja yang dibuat.

**Desain (mockup interaktif, 7 layar desktop + 8 layar mobile):** https://claude.ai/artifact/8wqQ5nqNaB3T2s2ALAgTGZ

---

## 0. Ringkasan: kamu ada di mana sekarang

**Aplikasinya apa?** Web app keuangan pribadi ala "Kantong" Bank Jago, pengganti spreadsheet. Fiturnya: rekening, kantong budget (dengan target dan progress bar), transaksi, tagihan rutin bulanan, dan catatan emas.

**Ada 2 repo, bersebelahan:**

| Folder | Isi | Port | Status |
|---|---|---|---|
| `../backend-finance-app` | NestJS + Prisma + PostgreSQL + Redis | `3000` | ✅ **Sudah jadi**: semua endpoint ada, didokumentasikan di `API_DOCS.md` |
| `finance-app` (repo ini) | Next.js 16 + Tailwind v4 | `3001` | ✅ **Semua halaman sudah dibuat** (20 Nov 2026). Tinggal dijalankan dan dicoba |

**Yang sudah ada di frontend:**
- `.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:3000` ✅
- `package.json` → `npm run dev` jalan di port 3001 ✅
- `lib/types.ts` ✅ (perlu diperbaiki)
- `CATATAN-BELAJAR.md`: catatan tanya-jawab arsitektur dari sesi sebelumnya

**Yang belum ada (pekerjaanmu selanjutnya):** `lib/api.ts`, `lib/auth-context.tsx`, halaman login, layout yang dilindungi login, dan 6 halaman fitur.

**Arsitektur singkat** (detail di `CATATAN-BELAJAR.md` bagian 4):

```
Browser (Next.js :3001)                         NestJS :3000
┌──────────────────────────┐   fetch + JWT    ┌───────────────────┐
│ page.tsx ('use client')  │ ───────────────► │ Controller        │
│   └─ useApi('/pockets')  │                  │   └─ Service      │
│        └─ lib/api.ts     │ ◄─────────────── │       └─ Prisma ──┼─► PostgreSQL
│ token di localStorage    │      JSON        │ Redis (dashboard) │
└──────────────────────────┘                  └───────────────────┘
```

Semua data diambil **di browser** (client component). Next.js di sini cuma jadi "kerangka UI + routing".

---

## 1. Menjalankan project

### Backend (terminal 1)

```bash
cd ../backend-finance-app
colima start                 # kalau pakai Colima (Docker di Mac)
docker compose up -d         # nyalakan PostgreSQL (5432) + Redis (6379)
npm install                  # sekali saja
npx prisma migrate dev       # buat/update tabel di database
npm run start:dev            # API jalan di http://localhost:3000
```

Cek backend hidup:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"tes@mail.com","password":"123456","name":"Tes"}'
```

Kalau keluar `access_token`, backend siap. (Kalau `409 Email already registered`, berarti akunnya sudah ada, dan itu juga artinya backend jalan.)

### Frontend (terminal 2)

```bash
cd finance-app
npm install
npm run dev                  # http://localhost:3001
```

> Setiap kali mengubah `.env.local`, **restart** `npm run dev`.

### ⚠️ Masalah yang ditemukan di laptopmu (20 Nov 2026)

1. **Port 3000 dan 3001 sedang dipakai project lain** (`erp-fe-hana-fashion` di 3000, `erp-be-hana-fashion` di 3001). Matikan dulu project itu sebelum menjalankan finance-app. Kalau tidak, backend finance gagal start dengan error `EADDRINUSE :3000`. Cek siapa yang memakai port: `lsof -iTCP:3000 -sTCP:LISTEN`.
   Kalau mau keduanya jalan bersamaan, ganti port di **tiga tempat sekaligus**: `app.listen(...)` di `backend-finance-app/src/main.ts`, `NEXT_PUBLIC_API_URL` di `.env.local`, dan port `npm run dev` di `package.json` + `FRONTEND_URL` (CORS) di `.env` backend.
2. **Ada dua PostgreSQL di port 5432**: satu dari Homebrew (lokal) dan satu container `finance_postgres`. `localhost:5432` ternyata mengarah ke **Postgres Homebrew**, jadi semua data finance tersimpan di sana, dan container Docker-nya kosong. Ini tidak masalah selama kamu konsisten. Tapi kalau suatu hari Postgres Homebrew dimatikan, datanya akan terlihat "hilang". Pilih salah satu: hentikan Postgres Homebrew (`brew services stop postgresql`) lalu jalankan `npx prisma migrate dev` ke container, **atau** hapus service `postgres` dari `docker-compose.yml`.

---

## 2. Peta aplikasi: layar → route → endpoint

| Layar (di desain) | Route frontend | File | Endpoint backend yang dipakai |
|---|---|---|---|
| Login / Daftar | `/login` | `app/login/page.tsx` | `POST /auth/login`, `POST /auth/register`, `GET /auth/profile` |
| Dashboard | `/dashboard` | `app/(protected)/dashboard/page.tsx` | `GET /dashboard/summary` |
| Rekening | `/accounts` | `app/(protected)/accounts/page.tsx` | `GET/POST /account`, `PATCH/DELETE /account/:id` |
| Kantong | `/pockets` | `app/(protected)/pockets/page.tsx` | `GET/POST /pockets`, `PATCH/DELETE /pockets/:id`, `POST /pockets/:id/topup` |
| Transaksi | `/transactions` | `app/(protected)/transactions/page.tsx` | `GET /transactions?type=&accountId=&pocketId=`, `POST /transactions` |
| Tagihan Rutin | `/fixed-costs` | `app/(protected)/fixed-costs/page.tsx` | `GET/POST /fixed-costs`, `PATCH/DELETE /fixed-costs/:id`, `PATCH /fixed-costs/:id/toggle-paid` |
| Lainnya (mobile saja) | `/more` | `app/(protected)/more/page.tsx` | — (menu Rekening, Emas, Keluar) |
| Emas | `/gold-assets` | `app/(protected)/gold-assets/page.tsx` | `GET/POST /gold-assets`, `GET /gold-assets/summary`, `DELETE /gold-assets/:id` |

> ⚠️ Perhatikan: endpoint rekening itu **`/account`** (tunggal), sedangkan yang lain jamak (`/pockets`, `/transactions`, ...).

Folder `(protected)` pakai tanda kurung. Itu **route group**: namanya tidak ikut masuk ke URL (`/dashboard`, bukan `/protected/dashboard`), tapi semua halaman di dalamnya berbagi satu `layout.tsx` yang mengecek login.

---

## 3. Desain & design tokens

Buka link desain di atas. Setiap layar bisa diklik, misalnya menu sidebar, tab Masuk/Daftar, filter transaksi, tombol "Isi kantong", dan toggle lunas.

**Gaya:** bersih dan tenang, sidebar gelap, kartu putih di latar abu-abu muda, satu warna aksen hijau-teal.

| Token Tailwind | Warna | Dipakai untuk |
|---|---|---|
| `bg-canvas` | `#F5F6F3` | latar halaman |
| `bg-surface` | `#FFFFFF` | kartu, form |
| `border-line` | `#E3E5E0` | garis kartu, track progress bar |
| `text-ink` / `bg-ink` | `#14171A` | teks utama, sidebar, kartu total saldo |
| `bg-ink-2` | `#262B30` | menu aktif di sidebar |
| `text-muted` | `#5B636B` | teks sekunder |
| `bg-brand` / `text-brand` | `#0F6B5C` | tombol utama, progress bar, **pemasukan (+)** |
| `bg-brand-soft` | `#E3F1EE` | badge "Target tercapai", avatar |
| `text-warn` | `#A14A0B` | **pengeluaran (−)**, tombol hapus |
| `bg-warn-soft` + `text-warn-dark` | `#FBEFE3` / `#7A3A0A` | kartu tagihan belum lunas, pesan error |
| `bg-mint` | `#5FD3B8` | logo "K" |

**Font:** *Space Grotesk* untuk judul dan angka besar (`font-display`), *Inter* untuk teks biasa (`font-sans`).

**Aturan angka uang:**
- Pemasukan: hijau, diawali `+`
- Pengeluaran: oranye, diawali `−`
- Transfer ke kantong: warna teks biasa, tanpa tanda
- Format pakai `formatRupiah()` → `Rp 1.500.000`

### Versi mobile

Satu kode untuk semua ukuran layar (responsive). Breakpoint-nya **`md` = 768px**:

| | HP (< 768px) | Desktop (≥ 768px) |
|---|---|---|
| Navigasi | **Bottom nav** 5 tab: Beranda, Kantong, Transaksi, Tagihan, Lainnya | Sidebar kiri, 6 menu |
| Rekening & Emas | lewat tab **Lainnya** (`/more`) | langsung di sidebar |
| Form (top-up, tambah, catat) | **bottom sheet**: muncul dari bawah, latar digelapkan | panel di samping list |
| Kartu ringkasan dashboard | 2 kolom, total saldo selebar layar | 4 kolom |
| Daftar transaksi | list ringkas (kategori, sumber · tanggal, nominal) | tabel |
| Tombol "Catat transaksi" | tombol bulat **+** melayang (FAB) di kanan bawah | tombol di header |

Aturan mobile yang wajib:
- Area sentuh minimal **44×44px** (`min-h-11`).
- Font input minimal **16px** (`text-base`). Kalau kurang, Safari iPhone otomatis zoom saat input diketuk.
- Beri jarak bawah konten (`pb-28`) supaya tidak tertutup bottom nav.
- Bottom nav memakai `env(safe-area-inset-bottom)` supaya tidak tertutup garis home iPhone.

Cara kerjanya di Tailwind: **tulis untuk mobile dulu, lalu timpa untuk desktop** dengan prefix `md:`. Contoh: `hidden md:flex` artinya "sembunyi di HP, tampil di desktop", dan `md:hidden` artinya kebalikannya.

---

## 4. Struktur folder target

```
finance-app/
├── app/
│   ├── globals.css               ← design tokens (Langkah 6)
│   ├── layout.tsx                ← font + <AuthProvider> (Langkah 6)
│   ├── page.tsx                  ← redirect ke /dashboard (Langkah 7)
│   ├── login/page.tsx            ← (Langkah 8)
│   └── (protected)/
│       ├── layout.tsx            ← cek login + sidebar (Langkah 9)
│       ├── dashboard/page.tsx    ← (Langkah 10)
│       ├── more/page.tsx         ← menu "Lainnya", mobile (Langkah 9b)
│       ├── pockets/page.tsx      ← contoh CRUD lengkap (Langkah 11)
│       ├── accounts/page.tsx     ← latihan (Langkah 12)
│       ├── transactions/page.tsx ← latihan
│       ├── fixed-costs/page.tsx  ← latihan
│       └── gold-assets/page.tsx  ← latihan
├── components/
│   ├── sidebar.tsx               ← desktop (Langkah 9)
│   └── bottom-nav.tsx            ← mobile (Langkah 9b)
└── lib/
    ├── types.ts                  ← (Langkah 1)
    ├── api.ts                    ← (Langkah 2)
    ├── format.ts                 ← (Langkah 3)
    ├── auth-context.tsx          ← (Langkah 4)
    └── use-api.ts                ← (Langkah 5)
```

---

## 5. Langkah demi langkah

> Tips: commit setiap selesai satu langkah (`git add . && git commit -m "..."`), supaya gampang balik kalau ada yang rusak.

### Langkah 1: Perbaiki `lib/types.ts`

`types.ts` yang sekarang **tidak cocok** dengan backend. Ini yang salah:

| Masalah | Sekarang | Seharusnya (sesuai backend) |
|---|---|---|
| Typo | `FixedCost.idPaid` | `isPaid` |
| Field salah | `GoldAssetSummary.totalWightInGrams`, `totalBuyValue` | `totalWeightGrams`, `totalInvestment`, `avgBuyPrice`, `totalRecords` |
| Kurang lengkap | `AuthResponse` cuma `access_token` | ada juga `message` dan `user` |
| Belum ada | — | `Account`, `Profile`, `DashboardSummary`, `CreateTransactionInput`, `TopupPocketInput` |
| Relasi | `Transaction` tanpa `account`/`pocket` | backend mengirim `account: {id, name}` dan `pocket: {id, name}` |

Ganti seluruh isi `lib/types.ts`:

```ts
// Kontrak data FE <-> BE. Sumber kebenaran: backend-finance-app/prisma/schema.prisma + API_DOCS.md

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  message: string;
  user: { id: string; email?: string };
  access_token: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  userId: string;
}

export interface Pocket {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  emoji?: string | null;
  userId: string;
}

/** GET /auth/profile */
export interface Profile {
  id: string;
  email: string;
  accounts: Account[];
  pockets: Pocket[];
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER_TO_POCKET';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: string; // ISO string, mis. "2026-06-16T00:00:00.000Z"
  accountId?: string | null;
  pocketId?: string | null;
  account?: { id: string; name: string } | null;
  pocket?: { id: string; name: string } | null;
}

/** Body POST /transactions */
export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  date?: string; // "YYYY-MM-DD"
  accountId?: string; // wajib untuk INCOME, atau EXPENSE dari rekening
  pocketId?: string; // EXPENSE dari kantong
}

/** Body POST /pockets/:id/topup */
export interface TopupPocketInput {
  accountId: string;
  amount: number;
  description?: string;
}

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  dueDate: number; // tanggal 1–31
  isPaid: boolean;
}

export interface GoldAsset {
  id: string;
  weightInGrams: number;
  buyPrice: number; // harga per gram
  purchaseDate: string;
}

/** GET /gold-assets/summary */
export interface GoldAssetSummary {
  totalWeightGrams: number;
  totalInvestment: number;
  avgBuyPrice: number;
  totalRecords: number;
}

/** GET /dashboard/summary */
export interface DashboardSummary {
  totalBalance: number;
  accounts: Account[];
  pockets: (Pocket & { progressPercent: number })[];
  fixedCosts: {
    total: number;
    paid: number;
    unpaid: number;
    totalMonthlyAmount: number;
    unpaidAmount: number;
  };
  goldAssets: Omit<GoldAssetSummary, 'totalRecords'>;
  recentTransactions: Transaction[];
  fromCache: boolean;
}
```

### Langkah 2: `lib/api.ts`, pembungkus `fetch`

Fungsinya supaya kamu tidak perlu menulis URL, header JWT, dan pengecekan error berulang-ulang di setiap halaman. Pemakaiannya:

```ts
const pockets = await api.get<Pocket[]>('/pockets');
await api.post('/pockets', { name: 'Kantong Makan', targetAmount: 1500000 });
```

Kalau backend membalas error, fungsi ini melempar `ApiError` berisi pesan dari backend (mis. `"Insufficient balance"`), yang bisa langsung kamu tampilkan ke user.

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const TOKEN_KEY = 'access_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  // Token expired / tidak valid -> buang token, lempar ke /login.
  // (Cek `token` supaya salah password di halaman login tidak ikut redirect.)
  if (res.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/login';
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // ValidationPipe NestJS mengirim `message` berupa array string
    const msg = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? 'Terjadi kesalahan');
    throw new ApiError(res.status, msg);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
```

### Langkah 3: `lib/format.ts`

Helper untuk menampilkan uang dan tanggal dalam format Indonesia.

```ts
export function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}
```

### Langkah 4: `lib/auth-context.tsx`

**React Context** = "variabel global" untuk komponen. Komponen mana saja bisa memanggil `useAuth()` untuk tahu siapa user yang login, lalu memanggil `login()`, `register()`, atau `logout()`.

Alurnya:
1. App dibuka → cek `localStorage`. Kalau ada token, panggil `GET /auth/profile`. Kalau berhasil, `user` terisi.
2. Selama proses itu `loading = true`. Ini penting supaya halaman tidak buru-buru redirect ke `/login`.
3. `login()` → simpan token → ambil profil.

> Kenapa setelah login/register kita tetap panggil `/auth/profile`? Karena response `register` di backend ada typo (`emial`, bukan `email`), jadi data user diambil ulang dari sumber yang pasti benar.

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from './api';
import type { AuthResponse, Profile, User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ambil data user dari token yang tersimpan
  const loadProfile = useCallback(async () => {
    try {
      const profile = await api.get<Profile>('/auth/profile');
      setUser({ id: profile.id, email: profile.email });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  // Saat aplikasi pertama dibuka: kalau ada token, coba pulihkan sesi
  useEffect(() => {
    async function init() {
      if (localStorage.getItem(TOKEN_KEY)) {
        await loadProfile();
      }
      setLoading(false);
    }
    init();
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    await loadProfile();
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    await loadProfile();
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
```

### Langkah 5: `lib/use-api.ts`, hook untuk mengambil data

Hampir semua halaman melakukan hal yang sama: "ambil data saat halaman dibuka, tampilkan loading, tampilkan error kalau gagal, lalu ambil ulang setelah ada perubahan". Hook ini membungkus pola itu:

```ts
const { data, error, loading, reload } = useApi<Pocket[]>('/pockets');
// setelah POST/PATCH/DELETE → panggil reload()
```

Kalau `path` berubah (mis. `/transactions?type=INCOME`), data otomatis diambil ulang.

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/** Ambil data GET dari backend + state loading/error + fungsi reload */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const result = await api.get<T>(path);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
```

### Langkah 6: Design tokens + root layout

Ganti isi `app/globals.css`. Dengan `@theme`, setiap warna otomatis jadi class Tailwind: `--color-brand` → `bg-brand`, `text-brand`, `border-brand`.

```css
@import "tailwindcss";

/* Design tokens — sama dengan mockup desain */
@theme {
  --color-canvas: #f5f6f3;      /* latar halaman */
  --color-surface: #ffffff;     /* kartu */
  --color-line: #e3e5e0;        /* border */
  --color-ink: #14171a;         /* teks utama & sidebar */
  --color-ink-2: #262b30;       /* menu aktif di sidebar */
  --color-muted: #5b636b;       /* teks sekunder */
  --color-brand: #0f6b5c;       /* aksen utama, pemasukan */
  --color-brand-dark: #0a4f44;
  --color-brand-soft: #e3f1ee;
  --color-mint: #5fd3b8;        /* logo */
  --color-warn: #a14a0b;        /* pengeluaran */
  --color-warn-dark: #7a3a0a;   /* teks di atas warn-soft */
  --color-warn-soft: #fbefe3;   /* tagihan belum lunas */
}

@theme inline {
  --font-sans: var(--font-inter);
  --font-display: var(--font-space-grotesk);
}

body {
  background: var(--color-canvas);
  color: var(--color-ink);
}
```

Ganti isi `app/layout.tsx` untuk memasang font, membungkus seluruh app dengan `<AuthProvider>`, dan mengatur `viewport` untuk HP:

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kantong',
  description: 'Catat keuangan, isi kantong budget, pantau tagihan dan emas.',
};

// viewportFit 'cover' -> konten boleh sampai area notch; bottom nav pakai env(safe-area-inset-bottom)
export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#f5f6f3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### Langkah 7: `app/page.tsx`, redirect

Halaman `/` cukup mengarahkan ke dashboard. Kalau user belum login, layout protected yang akan melempar ke `/login`.

```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

### Langkah 8: Halaman login + daftar

Satu halaman dengan dua mode (tab Masuk / Daftar), sama seperti di desain.

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal');
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    'min-h-12 text-base rounded-lg border border-[#cbd0ca] bg-surface px-3.5 outline-none focus:border-brand';

  return (
    <div className="flex min-h-screen flex-wrap">
      {/* Panel kiri: branding */}
      <section className="flex flex-[1_1_380px] flex-col justify-between gap-10 bg-ink p-8 text-white md:p-16">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-mint font-display text-xl font-bold text-ink">K</div>
          <span className="font-display text-[22px] font-bold">Kantong</span>
        </div>
        <div className="flex max-w-md flex-col gap-4">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Pisahkan uangmu ke kantong, bukan ke spreadsheet.
          </h1>
          <p className="text-lg leading-relaxed text-[#b9c0c6]">
            Catat pemasukan, isi kantong budget, pantau tagihan rutin dan tabungan emas di satu tempat.
          </p>
        </div>
        <div />
      </section>

      {/* Panel kanan: form */}
      <main className="flex flex-[1_1_420px] items-center justify-center p-8 md:p-16">
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-5">
          <div className="flex gap-1 rounded-xl bg-[#e9ebe6] p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`min-h-11 flex-1 rounded-[9px] font-semibold ${mode === m ? 'bg-surface' : ''}`}
              >
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          <h2 className="font-display text-[28px] font-bold">
            {mode === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}
          </h2>

          {mode === 'register' && (
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Nama
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Email
            <input type="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Password
            <input type="password" required minLength={6} className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-warn-dark">
              {error}
            </p>
          )}

          <button
            disabled={submitting}
            className="min-h-12 rounded-lg bg-brand font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>
      </main>
    </div>
  );
}
```

> ✅ **Checkpoint:** buka http://localhost:3001/login, lalu daftar akun baru. Kamu akan diarahkan ke `/dashboard`, yang masih 404 karena halamannya belum dibuat. Itu normal. Buka DevTools → Application → Local Storage: harus ada `access_token`.

### Langkah 9: Sidebar + layout yang dilindungi login

`components/sidebar.tsx` berisi menu navigasi desktop. `usePathname()` dipakai untuk menandai menu yang aktif. Class `hidden md:flex` membuat sidebar hanya muncul di layar ≥ 768px.

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IconArrows, IconBank, IconCalendar, IconDashboard, IconGold, IconLogout, IconWallet } from './icons';

const MENU = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/accounts', label: 'Rekening', Icon: IconBank },
  { href: '/pockets', label: 'Kantong', Icon: IconWallet },
  { href: '/transactions', label: 'Transaksi', Icon: IconArrows },
  { href: '/fixed-costs', label: 'Tagihan Rutin', Icon: IconCalendar },
  { href: '/gold-assets', label: 'Emas', Icon: IconGold },
];

// Navigasi desktop (>= 768px). Di HP diganti <BottomNav />.
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <nav aria-label="Menu utama" className="hidden flex-[1_1_220px] flex-col gap-7 bg-ink px-4 py-6 text-[#e8eae6] md:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex size-8 items-center justify-center rounded-[9px] bg-mint font-display text-lg font-bold text-ink">K</div>
        <span className="font-display text-xl font-bold">Kantong</span>
      </div>

      <ul className="flex flex-col gap-1">
        {MENU.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] ${
                  active ? 'bg-ink-2 font-semibold text-white' : 'text-[#b9c0c6] hover:text-white'
                }`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-2 border-t border-[#2e343a] px-2 pt-4">
        <span className="text-[13px] text-[#9aa3ab]">Masuk sebagai</span>
        <span className="truncate text-sm font-semibold">{user?.email}</span>
        <button onClick={handleLogout} className="flex min-h-11 items-center gap-2.5 text-left text-sm text-[#b9c0c6] hover:text-white">
          <IconLogout size={18} />
          Keluar
        </button>
      </div>
    </nav>
  );
}
```

`app/(protected)/layout.tsx` membungkus **semua** halaman fitur. Kalau belum login, user dilempar ke `/login`. Layout ini juga memasang `<BottomNav />` (dibuat di Langkah 9b):

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Memuat…</div>;
  }

  return (
    <div className="flex min-h-screen flex-wrap">
      <Sidebar />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 px-4 pt-6 pb-28 md:gap-7 md:px-12 md:pt-8 md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
```

> Kenapa pengecekan login dilakukan di client, bukan di `proxy.ts` (pengganti `middleware.ts` di Next 16)? Karena token disimpan di `localStorage`, dan server Next.js tidak bisa membacanya. Ini konsekuensi pilihan arsitektur di `CATATAN-BELAJAR.md`.

### Langkah 9b: Versi mobile, bottom nav + halaman "Lainnya"

Di HP, sidebar disembunyikan dan diganti **bottom nav** 5 tab. Rekening dan Emas tidak muat, jadi dipindah ke tab **Lainnya** (`/more`). Tab "Lainnya" juga ikut aktif saat user berada di `/accounts` atau `/gold-assets` (lihat `match`).

`components/bottom-nav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconArrows, IconCalendar, IconHome, IconMore, IconWallet } from './icons';

// Rekening & Emas tidak muat di 5 tab -> masuk ke halaman /more ("Lainnya")
const TABS = [
  { href: '/dashboard', label: 'Beranda', match: ['/dashboard'], Icon: IconHome },
  { href: '/pockets', label: 'Kantong', match: ['/pockets'], Icon: IconWallet },
  { href: '/transactions', label: 'Transaksi', match: ['/transactions'], Icon: IconArrows },
  { href: '/fixed-costs', label: 'Tagihan', match: ['/fixed-costs'], Icon: IconCalendar },
  { href: '/more', label: 'Lainnya', match: ['/more', '/accounts', '/gold-assets'], Icon: IconMore },
];

// Navigasi HP (< 768px). Di desktop diganti <Sidebar />.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface px-1 pt-1.5 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      {TABS.map(({ href, label, match, Icon }) => {
        const active = match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-13 flex-col items-center justify-center gap-1 text-xs ${
              active ? 'font-bold text-brand' : 'font-medium text-muted'
            }`}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

> Ikonnya diambil dari `components/icons.tsx` (Langkah 9c), berupa SVG yang sama dengan desain, tanpa library tambahan.

`app/(protected)/more/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IconBank, IconChevronRight, IconGold, IconLogout } from '@/components/icons';

// Halaman "Lainnya" — khusus HP (di desktop semua menu sudah ada di sidebar)
export default function MorePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const items = [
    { href: '/accounts', label: 'Rekening', note: 'Rekening bank & e-wallet', Icon: IconBank, tone: 'bg-brand-soft text-brand' },
    { href: '/gold-assets', label: 'Emas', note: 'Catatan pembelian emas', Icon: IconGold, tone: 'bg-warn-soft text-warn' },
  ];

  return (
    <>
      <h1 className="font-display text-[26px] font-bold">Lainnya</h1>

      <section aria-label="Akun" className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-white">
        <div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-mint font-display text-xl font-bold text-ink">
          {user?.email.charAt(0).toUpperCase()}
        </div>
        <span className="truncate text-sm text-[#b9c0c6]">{user?.email}</span>
      </section>

      <ul className="flex flex-col rounded-2xl border border-line bg-surface px-4">
        {items.map(({ href, label, note, Icon, tone }) => (
          <li key={href} className="border-b border-[#eef0ec] last:border-0">
            <Link href={href} className="flex min-h-15 items-center gap-3.5">
              <span aria-hidden="true" className={`flex size-10 items-center justify-center rounded-[10px] ${tone}`}>
                <Icon />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">{label}</span>
                <span className="text-[13px] text-muted">{note}</span>
              </span>
              <IconChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          logout();
          router.replace('/login');
        }}
        className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-[#e2b98f] bg-surface font-semibold text-warn-dark"
      >
        <IconLogout size={18} />
        Keluar
      </button>
    </>
  );
}
```

> ✅ **Checkpoint mobile:** di Chrome buka DevTools → klik ikon HP (Toggle device toolbar, `Cmd+Shift+M`) → pilih "iPhone 12 Pro". Sidebar harus hilang dan bottom nav muncul. Paling enak dites langsung di HP: jalankan `npm run dev -- -H 0.0.0.0`, lalu buka `http://<IP-laptop>:3001` dari HP yang tersambung ke WiFi yang sama. Jangan lupa tambahkan origin itu ke CORS backend (`FRONTEND_URL`).

### Langkah 9c: Komponen bersama (`components/ui.tsx` + `components/icons.tsx`)

Setelah 2–3 halaman, polanya mulai berulang: input, label, kotak error, dan form yang tampil sebagai bottom sheet di HP. Semua itu dikumpulkan di `components/ui.tsx`. Bagian terpentingnya adalah **`FormPanel`**:

| Prop | Arti |
|---|---|
| `open` | HP: bottom sheet tampil atau tidak |
| `desktopAlways` | Desktop: form selalu tampil di samping list (Rekening, Transaksi, Tagihan, Emas) |
| `highlight` | Diberi border hijau (dipakai di form top-up kantong) |

`components/icons.tsx` berisi ikon SVG yang sama dengan desain, jadi tidak perlu install library ikon. Pemakaiannya: `<IconWallet size={22} />`.

```tsx
'use client';

import Link from 'next/link';
import { IconChevronLeft, IconClose, IconPlus } from './icons';

/** Class standar untuk <input>/<select>. text-base (16px) mencegah auto-zoom di iPhone. */
export const inputClass =
  'min-h-12 w-full rounded-lg border border-[#cbd0ca] bg-surface px-3.5 text-base outline-none focus:border-brand';

export const primaryButton =
  'min-h-12 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark disabled:opacity-60';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-warn-soft px-3.5 py-3 text-sm text-warn-dark">
      {message}
    </p>
  );
}

export function Loading() {
  return <p className="text-muted">Memuat…</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-muted">{children}</p>;
}

/**
 * Judul halaman. `backHref` -> tombol kembali (hanya di HP, mis. ke /more).
 * `onAdd` -> tombol + kecil di kanan (hanya di HP, karena di desktop form selalu terlihat).
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  onAdd,
  addLabel,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  onAdd?: () => void;
  addLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        {backHref && (
          <Link href={backHref} aria-label="Kembali" className="-ml-3 flex size-11 items-center justify-center md:hidden">
            <IconChevronLeft size={22} />
          </Link>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] font-bold tracking-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted md:text-base">{subtitle}</p>}
        </div>
      </div>
      {action}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel ?? 'Tambah'}
          className="flex size-11 items-center justify-center rounded-xl border border-[#cbd0ca] bg-surface md:hidden"
        >
          <IconPlus />
        </button>
      )}
    </header>
  );
}

/**
 * Form yang tampil sebagai:
 * - HP: bottom sheet (muncul dari bawah, latar gelap) — hanya saat `open`
 * - Desktop: panel di samping list — selalu tampil kalau `desktopAlways`, selain itu hanya saat `open`
 */
export function FormPanel({
  title,
  open,
  desktopAlways = false,
  highlight = false,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  open: boolean;
  desktopAlways?: boolean;
  highlight?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  const mobile = open ? 'fixed inset-0 z-50 flex items-end bg-ink/45' : 'hidden';
  const desktop = open || desktopAlways ? 'md:static md:z-auto md:block md:bg-transparent' : 'md:hidden';

  return (
    <div className={`${mobile} ${desktop} md:flex-[1_1_300px]`} onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-surface p-5 pb-8 md:max-h-none md:rounded-2xl md:border md:p-6 ${
          highlight ? 'md:border-2 md:border-brand' : 'md:border-line'
        }`}
      >
        <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-[#cbd0ca] md:hidden" />
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`flex size-11 items-center justify-center ${desktopAlways ? 'md:hidden' : ''}`}
          >
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </form>
    </div>
  );
}

/** Tombol + bulat melayang di kanan bawah (khusus HP) */
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-4 bottom-24 z-30 flex size-14 items-center justify-center rounded-[18px] bg-brand text-white shadow-[0_6px_16px_rgba(15,107,92,0.35)] md:hidden"
    >
      <IconPlus size={24} />
    </button>
  );
}
```

### Langkah 10: Dashboard

Satu request ke `/dashboard/summary` sudah berisi semua yang dibutuhkan: total saldo, kantong, tagihan, emas, dan 5 transaksi terakhir.

```tsx
'use client';

import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { formatRupiah, formatTanggal } from '@/lib/format';
import type { DashboardSummary, Transaction } from '@/lib/types';
import { IconPlus } from '@/components/icons';
import { EmptyState, ErrorBox, Loading } from '@/components/ui';

function formatHariIni() {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

export default function DashboardPage() {
  const { data, error, loading } = useApi<DashboardSummary>('/dashboard/summary');

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? 'Gagal memuat dashboard'} />;

  const pocketTotal = data.pockets.reduce((sum, p) => sum + p.currentAmount, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">{formatHariIni()}</span>
          <h1 className="font-display text-[26px] font-bold tracking-tight md:text-3xl">Dashboard</h1>
        </div>
        <Link href="/transactions" className="flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark">
          <IconPlus size={18} />
          Catat Transaksi
        </Link>
      </header>

      {/* Kartu ringkasan */}
      <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard wide dark label="Total saldo rekening" value={formatRupiah(data.totalBalance)} note={`dari ${data.accounts.length} rekening`} />
        <StatCard label="Dana di kantong" value={formatRupiah(pocketTotal)} note={`${data.pockets.length} kantong`} />
        <StatCard warn label="Tagihan belum lunas" value={formatRupiah(data.fixedCosts.unpaidAmount)} note={`${data.fixedCosts.unpaid} dari ${data.fixedCosts.total} tagihan`} />
        <StatCard label="Emas" value={`${data.goldAssets.totalWeightGrams} gram`} note={`Modal ${formatRupiah(data.goldAssets.totalInvestment)}`} />
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {/* Progres kantong */}
        <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Kantong</h2>
          {data.pockets.length === 0 && <EmptyState>Belum ada kantong.</EmptyState>}
          {data.pockets.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <div className="flex justify-between gap-3 text-[15px]">
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted">
                  {formatRupiah(p.currentAmount)} / {formatRupiah(p.targetAmount)}
                </span>
              </div>
              <ProgressBar percent={p.progressPercent} label={p.name} />
            </div>
          ))}
        </section>

        {/* Rekening */}
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold">Rekening</h2>
          {data.accounts.length === 0 && <EmptyState>Belum ada rekening.</EmptyState>}
          {data.accounts.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-[#eef0ec] py-3 last:border-0">
              <span className="font-semibold">{a.name}</span>
              <span className="font-semibold">{formatRupiah(a.balance)}</span>
            </div>
          ))}
        </section>
      </div>

      {/* Transaksi terbaru */}
      <section className="flex flex-col rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-2 font-display text-xl font-semibold">Transaksi terbaru</h2>
        {data.recentTransactions.length === 0 && <EmptyState>Belum ada transaksi.</EmptyState>}
        {data.recentTransactions.map((t) => (
          <TransactionRow key={t.id} t={t} />
        ))}
      </section>
    </>
  );
}

function StatCard({ label, value, note, dark, warn, wide }: { label: string; value: string; note: string; dark?: boolean; warn?: boolean; wide?: boolean }) {
  const style = dark
    ? 'bg-ink text-white'
    : warn
      ? 'bg-warn-soft text-warn-dark border border-[#f1d9bf]'
      : 'bg-surface border border-line';
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-4 md:gap-2 md:p-5 ${wide ? 'col-span-2 lg:col-span-1' : ''} ${style}`}>
      <span className="text-[13px] opacity-80">{label}</span>
      <span className="font-display text-lg font-bold md:text-[28px]">{value}</span>
      <span className="text-[13px] opacity-80">{note}</span>
    </div>
  );
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div role="progressbar" aria-label={`Progres ${label}`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-brand" style={{ width: `${p}%` }} />
    </div>
  );
}

function TransactionRow({ t }: { t: Transaction }) {
  const sign = t.type === 'INCOME' ? '+ ' : t.type === 'EXPENSE' ? '− ' : '';
  const color = t.type === 'INCOME' ? 'text-brand' : t.type === 'EXPENSE' ? 'text-warn' : 'text-ink';
  const source = t.pocket?.name ?? t.account?.name ?? '-';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0ec] py-3">
      <div className="flex flex-col">
        <span className="font-semibold">{t.category}</span>
        <span className="text-[13px] text-muted">
          {source} · {formatTanggal(t.date)}
        </span>
      </div>
      <span className={`font-bold ${color}`}>
        {sign}
        {formatRupiah(t.amount)}
      </span>
    </div>
  );
}
```

> ✅ **Checkpoint:** login, lalu dashboard tampil dengan angka 0 (karena belum ada data). Tambah data lewat `curl` atau Postman dulu kalau mau lihat isinya, atau lanjut ke Langkah 11.

### Langkah 11: Kantong, contoh CRUD lengkap

Halaman ini menunjukkan pola yang **akan kamu ulangi** di halaman-halaman lain:
1. `useApi()` untuk mengambil list
2. Form → `api.post(...)` → `reload()`
3. Tampilkan `error.message` dari backend kalau gagal

Fitur utamanya **top-up**: memindahkan dana dari rekening ke kantong (`POST /pockets/:id/topup`). Perhatikan pembungkus `<div>` di `TopupForm`: di HP form tampil sebagai **bottom sheet** (`fixed inset-0 ... items-end`), sedangkan di desktop class `md:static` mengembalikannya jadi panel biasa. Pola ini bisa kamu pakai ulang untuk semua form.

```tsx
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
```

> ✅ **Checkpoint:** di halaman `/pockets`, klik "Kantong baru", buat kantong, lalu klik "Isi kantong". Saldo rekening harus berkurang dan progress bar kantong bertambah.

### Langkah 12: 4 halaman sisanya (✅ sudah dibuat)

Keempat halaman ini sudah ada di repo. Spesifikasi di bawah ini yang dipakai saat membuatnya, jadi bisa kamu jadikan bahan untuk membaca kodenya:

| Halaman | File |
|---|---|
| Rekening | [app/(protected)/accounts/page.tsx](../app/(protected)/accounts/page.tsx) |
| Transaksi | [app/(protected)/transactions/page.tsx](../app/(protected)/transactions/page.tsx) (server, baca `?accountId=`) + [transactions-client.tsx](../app/(protected)/transactions/transactions-client.tsx) |
| Tagihan | [app/(protected)/fixed-costs/page.tsx](../app/(protected)/fixed-costs/page.tsx) |
| Emas | [app/(protected)/gold-assets/page.tsx](../app/(protected)/gold-assets/page.tsx) |

#### `/accounts`: Rekening
- List: `useApi<Account[]>('/account')`, ditampilkan sebagai grid kartu (nama + saldo)
- Tambah: `api.post('/account', { name, balance? })`. `name` minimal 2 karakter
- Ubah: `api.patch('/account/' + id, { name?, balance? })`
- Hapus: `api.delete('/account/' + id)`
- Menghapus rekening yang sudah punya transaksi **berhasil**. Transaksinya tidak ikut terhapus; `accountId`-nya dikosongkan (default Prisma untuk relasi opsional = `SetNull`). Jadi beri tahu user lewat `confirm()`.

#### `/transactions`: Transaksi
- Filter tipe: simpan `type` di `useState`, lalu `useApi<Transaction[]>(type ? '/transactions?type=' + type : '/transactions')`. Hook otomatis mengambil ulang data saat path berubah.
- Form: tipe `INCOME` / `EXPENSE`, `amount`, `category`, `date?` (format `YYYY-MM-DD` dari `<input type="date">`), `description?`
- Sumber dana:
  - `INCOME` → wajib `accountId`
  - `EXPENSE` → `accountId` **atau** `pocketId` (pengeluaran dari kantong)
  - Tips: isi `<select>` dengan value `"account:<id>"` / `"pocket:<id>"`, lalu pecah dengan `value.split(':')`
- Ambil daftar rekening + kantong untuk `<select>`: `useApi<Account[]>('/account')`, `useApi<Pocket[]>('/pockets')`
- Mobile: tampilkan list ringkas (bukan tabel), lalu tombol **+** melayang: `fixed right-4 bottom-24 md:hidden`. Tombol ini membuka form sebagai bottom sheet, dengan pola yang sama seperti `TopupForm`.
- Backend **tidak punya** endpoint edit/hapus transaksi, jadi jangan buat tombolnya.
- Error yang mungkin muncul: `"Insufficient balance"` kalau saldo kurang.

#### `/fixed-costs`: Tagihan Rutin
- List: `useApi<FixedCost[]>('/fixed-costs')` (sudah diurutkan per tanggal jatuh tempo)
- Ringkasan di atas: hitung sendiri dengan `.reduce()` → total, jumlah lunas, nominal belum lunas
- Toggle lunas: `api.patch('/fixed-costs/' + id + '/toggle-paid')` → `reload()`
- Tambah: `api.post('/fixed-costs', { name, amount, dueDate })`, dengan `dueDate` 1–31 (`Number(...)`)

#### `/gold-assets`: Emas
- Dua request: `useApi<GoldAsset[]>('/gold-assets')` dan `useApi<GoldAssetSummary>('/gold-assets/summary')`
- Total per baris = `weightInGrams * buyPrice`
- Tambah: `api.post('/gold-assets', { weightInGrams, buyPrice, purchaseDate? })` → reload **keduanya**
- Hapus: `api.delete('/gold-assets/' + id)`

> 💡 Kalau ada kode yang terulang di banyak halaman (input, tombol, kartu), pindahkan ke `components/` (mis. `components/ui.tsx` berisi `<Card>`, `<Button>`, `<Field>`). Jangan dikerjakan di awal. Kerjakan setelah polanya kelihatan berulang 2–3 kali.

---

## 6. Hal yang perlu diwaspadai

**Dari backend (sudah dicek di kode `backend-finance-app`):**

1. **Dashboard bisa telat sampai 60 detik.** `/dashboard/summary` di-cache di Redis selama 60 detik, dan tidak ada service yang menghapus cache saat data berubah. Akibatnya, setelah menambah transaksi lalu kembali ke dashboard, angkanya bisa belum berubah. Perbaikan di backend: panggil `this.cache.del('dashboard_summary_' + userId)` di service transaksi, kantong, dan lain-lain setiap kali menulis data. Alternatifnya, kecilkan TTL.
2. **`/auth/profile` tidak mengembalikan `name`.** Kalau mau menampilkan "Halo, [Nama]", tambahkan `name: true` di `select` pada `auth.service.ts → getProfile()`.
3. **Typo `emial`** di response `register` (`auth.service.ts`). Frontend sudah mengakalinya (Langkah 4), tapi sebaiknya tetap diperbaiki.
4. **Uang disimpan sebagai `Float`.** Untuk belajar tidak masalah. Untuk aplikasi serius, gunakan `Int` (dalam rupiah) atau `Decimal`, karena float bisa menghasilkan `0.1 + 0.2 = 0.30000000000000004`.
5. **CORS:** backend hanya mengizinkan `http://localhost:3001` (atau `FRONTEND_URL` di `.env` backend). Kalau port frontend diganti, ubah juga di backend.

**Dari Next.js 16 (baca `node_modules/next/dist/docs/` kalau ragu):**

1. File `page.tsx` / `layout.tsx` **hanya boleh** `export default` + beberapa export khusus (`metadata`, dll). Komponen bantu jangan di-`export` dari file page, karena build akan error.
2. Halaman dinamis (`[id]/page.tsx`): `params` sekarang berupa **Promise**, jadi harus di-`await`. Lihat `CATATAN-BELAJAR.md` bagian 5.
3. `middleware.ts` sudah diganti jadi `proxy.ts`, tapi project ini tidak memakainya.
4. Semua halaman fitur butuh `'use client'` di baris pertama, karena memakai `useState`, `useEffect`, dan `localStorage`.

---

## 7. Checklist progres

- [x] Langkah 1: `lib/types.ts` diperbaiki
- [x] Langkah 2: `lib/api.ts`
- [x] Langkah 3: `lib/format.ts`
- [x] Langkah 4: `lib/auth-context.tsx`
- [x] Langkah 5: `lib/use-api.ts`
- [x] Langkah 6: `globals.css` + `layout.tsx`
- [x] Langkah 7: `app/page.tsx` redirect
- [x] Langkah 8: `/login` (✅ checkpoint: bisa daftar dan login)
- [x] Langkah 9: sidebar + `(protected)/layout.tsx`
- [x] Langkah 9b: bottom nav + `/more` (✅ checkpoint: tampilan HP di DevTools)
- [x] Langkah 10: `/dashboard`
- [x] Langkah 11: `/pockets` + form kantong baru
- [x] Langkah 12a: `/accounts`
- [x] Langkah 12b: `/transactions`
- [x] Langkah 12c: `/fixed-costs`
- [x] Langkah 12d: `/gold-assets`
- [ ] Bonus: perbaiki cache dashboard + `name` di profile (backend)
- [ ] Cek semua halaman di lebar 390px (di browser sungguhan): tidak ada scroll horizontal, form jadi bottom sheet
- [x] Ikon (`components/icons.tsx`) + komponen UI bersama (`components/ui.tsx`)

---

## 8. Yang sudah dikerjakan (20 November 2026)

**Semua halaman di desain sudah dibuat**, untuk desktop (sidebar) maupun mobile (bottom nav + bottom sheet):

| Route | Fitur |
|---|---|
| `/login` | Masuk + daftar (tab), pesan error dari backend |
| `/dashboard` | Total saldo, dana di kantong, tagihan belum lunas, emas, progres kantong, rekening, 5 transaksi terakhir |
| `/accounts` | List rekening, tambah, ubah (nama/saldo), hapus, tombol "Riwayat" → `/transactions?accountId=…` |
| `/pockets` | List kantong + progress, kantong baru (dengan emoji), isi kantong dari rekening (+ tombol cepat 100rb/250rb/500rb), hapus |
| `/transactions` | Filter tipe + filter rekening, tabel (desktop) / list (HP), catat pemasukan/pengeluaran dari rekening **atau** kantong, tombol + melayang di HP |
| `/fixed-costs` | Ringkasan + progress lunas, toggle lunas, tambah, hapus |
| `/gold-assets` | Ringkasan portofolio, riwayat pembelian, catat pembelian (dengan hitung total otomatis), hapus |
| `/more` | Menu "Lainnya" di HP: Rekening, Emas, Keluar |

**Cara verifikasinya:**
- `tsc`, `eslint`, dan `next build` lolos, dan semua 10 route ter-render.
- Semua endpoint yang dipakai frontend dites langsung ke backend dengan user tes sementara (data tes sudah dihapus lagi): register/login/profile, rekening, kantong + top-up, transaksi (pemasukan, pengeluaran dari kantong, error saldo kurang, filter), tagihan + toggle, emas + summary, dashboard, token salah → 401. Semua bentuk response cocok dengan `lib/types.ts`.

**Yang belum dites:** klik-klik di browser sungguhan, karena port 3000/3001 di laptopmu sedang dipakai project lain (lihat Bagian 1).

**Ide lanjutan:**
- Perbaikan backend di Bagian 6 (cache dashboard, `name` di profile, typo `emial`)
- Edit kantong (`PATCH /pockets/:id`) dan edit tagihan/emas (endpoint PATCH-nya sudah ada di backend)
- Grafik cash flow bulanan (pemasukan vs pengeluaran per bulan)
- Notifikasi tagihan yang jatuh tempo dalam 3 hari
