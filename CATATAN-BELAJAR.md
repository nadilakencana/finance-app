# Catatan Belajar — Frontend Finance App (Next.js)

Kumpulan tanya-jawab seputar scaffolding frontend untuk project finance/budgeting app ini. Backend NestJS jalan di `localhost:3000`, frontend Next.js di `localhost:3001`.

---

## 1. Next.js itu pakai React.js atau bukan?

Project ini pakai **Next.js** (App Router) — di dalamnya tetap **React.js** sebagai library UI-nya (JSX, hooks `useState`/`useEffect`, dll, itu semua React biasa).

Next.js menambahkan di atas React:
- Routing berbasis folder (`app/` directory)
- Konsep Server Component vs Client Component (`'use client'`)
- Konvensi file (`page.tsx`, `layout.tsx`)

Project ini sudah di-scaffold dengan `create-next-app` (lihat `package.json`: ada `next`, `react`, `react-dom`) — bukan React murni (Create React App/Vite). Jadi semua kode yang ditulis tetap "React", hanya dibungkus aturan Next.js.

---

## 2. Soal `.env.local` — apakah kita bikin file baru?

Ya, bikin file baru bernama **`.env.local`** di root project (sejajar dengan `package.json`, `next.config.ts`).

Isinya:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Poin penting:
- Prefix **`NEXT_PUBLIC_`** wajib supaya env var bisa diakses dari client component (browser). Tanpa prefix itu, env var hanya bisa dibaca di server.
- Next.js otomatis baca file ini saat `next dev`/`next build` — tidak perlu install `dotenv` atau package tambahan.
- Default `.gitignore` Next.js biasanya sudah meng-ignore `*.env.local`, jadi file ini aman, tidak ikut ke-commit ke git.
- Setelah bikin/ubah file ini, **harus restart `npm run dev`** — env var hanya dibaca saat server start.

---

## 3. Fungsi `lib/types.ts` — kenapa harus dibuat?

`lib/types.ts` isinya **definisi TypeScript type/interface** untuk bentuk data yang dipertukarkan dengan backend (`Account`, `Pocket`, `Transaction`, dll).

**Kenapa perlu:**
1. **Type safety** — TypeScript bisa cek di compile-time kalau salah pakai field (typo, lupa field wajib). Tanpa ini, hasil `fetch` cuma `any`, error baru ketahuan saat runtime.
2. **Autocomplete di editor** — ketik `account.` langsung muncul saran `name`, `balance`, dll.
3. **Dokumentasi hidup** — referensi shape DTO backend tanpa harus buka kode backend terus-menerus.
4. **Kontrak FE-BE** — kalau backend ubah shape response, cukup update di satu tempat (`types.ts`), TypeScript akan tunjukkan semua tempat yang perlu diperbaiki.

**Wajib secara teknis?** Tidak — Next.js/React tetap jalan walau pakai `any` semua. Tapi tanpa type, gampang kena bug silent yang baru ketahuan saat user klik tombol dan dapat error dari API.

**File/konsep serupa di tempat lain:**
- Backend NestJS biasanya punya **DTO** (`*.dto.ts`, mis. `create-account.dto.ts`) atau **Entity** (`account.entity.ts`) — versi backend dari "kontrak data" yang sama. `lib/types.ts` di frontend adalah mirror manual dari DTO/Entity tersebut.
- Pola lebih advanced: **shared types package** dalam monorepo (satu folder types dipakai bareng FE & BE) supaya tidak duplikasi manual. Untuk project sederhana ini, duplikasi manual sudah cukup.
- Alternatif lain: **Zod schema** (`lib/schemas.ts`) — selain kasih TypeScript type, juga validasi runtime (misal validasi form sebelum submit). Sering dipakai bareng React Hook Form di project yang lebih besar.

---

## 4. Gambaran arsitektur keseluruhan (Backend ↔ Frontend)

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (client)                                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Next.js App Router — localhost:3001                   │  │
│  │                                                         │  │
│  │  app/login, app/register        → halaman publik       │  │
│  │  app/(protected)/...             → halaman butuh login │  │
│  │     ├─ dashboard                                       │  │
│  │     ├─ accounts / pockets / transactions               │  │
│  │     └─ fixed-costs / gold-assets                       │  │
│  │                                                         │  │
│  │  lib/auth-context.tsx  → state: user, token (in-memory)│  │
│  │  lib/api.ts            → fetch wrapper + JWT header    │  │
│  │  lib/types.ts          → kontrak shape data             │  │
│  │                                                         │  │
│  │  localStorage: access_token  (disimpan di browser)     │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │  fetch() via lib/api.ts
                            │  Authorization: Bearer <token>
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS Backend — localhost:3000                             │
│                                                                │
│  AuthModule      → /auth/register, /auth/login, /auth/profile│
│  AccountModule   → /account/*                                │
│  PocketModule    → /pockets/* (+ topup, transfer logic)      │
│  TransactionModule → /transactions/*                          │
│  FixedCostModule → /fixed-costs/*                             │
│  GoldAssetModule → /gold-assets/*                             │
│  DashboardModule → /dashboard/summary                         │
│                                                                │
│  JWT Guard → validasi Bearer token di setiap request          │
│  (kecuali /auth/register & /auth/login)                       │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
                     [ Database ]
              (Postgres/MySQL via Prisma/TypeORM —
               cek backend project untuk pastinya)
```

**Alur request, contoh "lihat dashboard":**
1. User buka `/dashboard` di browser.
2. `app/(protected)/layout.tsx` cek `useAuth()` — kalau belum ada `user`, redirect ke `/login`.
3. Kalau sudah login, `app/(protected)/dashboard/page.tsx` jalanin `api.get('/dashboard/summary')`.
4. `lib/api.ts` ambil token dari `localStorage`, tempel header `Authorization: Bearer <token>`, lalu `fetch('http://localhost:3000/dashboard/summary', ...)`.
5. NestJS: JWT Guard validasi token → kalau valid, controller jalan, ambil data dari DB → balikin JSON.
6. Kalau token invalid/expired → NestJS balas `401` → `lib/api.ts` otomatis hapus token & redirect ke `/login`.

**Poin arsitektur penting:**
- **Dua server berbeda, dua port berbeda** — Next.js (3001) cuma render UI, NestJS (3000) yang pegang semua logic & data. Next.js di sini perannya murni **client-side SPA-style**, hampir tidak ada server-side rendering data dari NestJS (fetch terjadi di client component, browser langsung manggil API NestJS — bukan lewat Next.js server).
- **Auth state hidup di browser** (`localStorage` + React Context), bukan di cookie httpOnly — lebih rentan ke XSS dibanding pola BFF (Backend-for-Frontend), tapi lebih simpel untuk dikerjakan/dipahami sekarang.
- **CORS** penting karena dua origin berbeda (3000 vs 3001) — NestJS harus explicitly allow origin `http://localhost:3001`.
- Next.js App Router di sini **under-utilized** — kemampuan Server Components/data fetching di server tidak dipakai, karena semua data datang dari API eksternal yang butuh token per-user di client. Trade-off wajar untuk SPA yang nempel ke backend terpisah.

---

## 5. Catatan tambahan soal Next.js 16 (versi project ini)

Project ini pakai **Next.js 16.2.3**, ada beberapa breaking changes dari versi sebelumnya yang relevan:

- `middleware.ts` **dihapus/diganti `proxy.ts`** — tapi di project ini tidak dipakai sama sekali, auth guard dilakukan di client (karena token di localStorage, tidak bisa dibaca server-side tanpa cookie).
- `params` di halaman dinamis (`[id]/page.tsx`) sekarang **Promise**, harus `await`. Karena fetch ke NestJS dilakukan di client, pola yang dipakai: `page.tsx` jadi **Server Component** kecil yang `await params`, lalu lempar `id` ke Client Component (`edit-client.tsx`) yang melakukan fetch data.
