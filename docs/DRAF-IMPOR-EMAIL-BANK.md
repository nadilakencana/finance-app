# Draf: Catat transaksi otomatis dari email bank

Status: **ide, belum dikerjakan** (ditulis 22 November 2026)

Tujuan: Kantong membaca email notifikasi dari bank dan e-wallet, lalu mencatat pemasukan dan pengeluaran tanpa input manual.

## Catatan realistis

Tidak semua bank mengirim email untuk setiap transaksi.

- **Biasanya ada email:** e-wallet (GoPay, OVO, ShopeePay, DANA) untuk pembayaran dan top up, bank digital (Jago, Jenius, SeaBank, blu), transfer dan pembayaran dari m-banking (Livin', BRImo, BNI), serta tagihan kartu kredit.
- **Sering tidak ada email:** tarik tunai, debit di mesin EDC, transfer masuk di beberapa bank, dan BCA yang kebanyakan lewat notifikasi aplikasi atau SMS.

Jadi email bisa menangkap sebagian besar transaksi, dan input manual tetap perlu sebagai pelengkap.

## Cara mengambil email

| Cara | Kelebihan | Kekurangan |
|---|---|---|
| **1. Forward otomatis** ke alamat unik, misalnya `u-8f3k2@in.kantong.app` | Paling aman, aplikasi hanya menerima email bank dan tidak bisa membaca inbox. Cocok untuk penyedia email apa pun. | Perlu domain dan layanan email masuk (Cloudflare Email Routing, Mailgun, atau Postmark Inbound) |
| **2. Gmail API** (OAuth) | Pengalaman paling mulus, cukup sekali klik "Hubungkan Gmail" | Izin baca Gmail termasuk kategori *restricted*. Untuk dirilis publik perlu audit keamanan Google yang mahal. Mode testing (maksimal 100 user) masih aman untuk dipakai sendiri. |
| **3. IMAP** dengan app password | Mudah dibuat | Aplikasi memegang akses ke seluruh inbox, risikonya besar kalau server bocor |

**Pilihan: cara 1.** User membuat filter Gmail, misalnya `from:(gopay OR jago OR bankmandiri)`, lalu mengaktifkan forward ke alamat uniknya.

## Alur

```
Email bank → layanan inbound → POST /inbound-email (webhook)
  → cek keaslian pengirim (DKIM/SPF + daftar domain bank)
  → cari pemilik dari alamat unik u-xxxx
  → ekstrak: jenis, nominal, tanggal, merchant, nomor referensi, rekening
  → simpan sebagai "Perlu dicek" (belum jadi transaksi)
  → user konfirmasi → menjadi Transaksi, saldo rekening berubah
```

## Cara membaca isi email

- **Template per bank (regex):** cepat, gratis, dan akurat, tapi rusak kalau bank mengubah format emailnya.
- **AI (misalnya Claude Haiku) dengan output terstruktur:** bisa membaca format apa saja dengan biaya sekitar Rp 1–3 per email. Isi email ikut dikirim ke penyedia AI.
- **Gabungan (dipilih):** pakai template dulu, dan AI hanya dipakai untuk bank yang belum dikenal.

## Keamanan dan data

1. **Email palsu.** Siapa pun bisa mengirim email ke alamat forward. Karena itu wajib ada cek DKIM dan pengirim harus ada di daftar domain bank yang diizinkan.
2. **Duplikat.** Nomor referensi transaksi disimpan di `externalRef` yang unik per user.
3. **Tidak langsung jadi transaksi.** Semua masuk ke antrean "Perlu dicek" dulu karena parser bisa salah membaca nominal.
4. **Email mentah tidak disimpan lama.** Isinya dihapus setelah 7 hari, hasil ekstraksinya saja yang disimpan.
5. **Alamat forward bisa diganti.** Kalau alamatnya bocor, user bisa membuat alamat baru.
6. **Pencocokan rekening.** Setiap Rekening menyimpan 4 digit terakhir nomor rekening atau nama e-wallet, supaya transaksi masuk ke rekening yang benar.

## Perubahan kode

**Backend (`../backend-finance-app`)**
- Endpoint ubah dan hapus transaksi. Ini belum ada, padahal dibutuhkan untuk memperbaiki transaksi yang salah tercatat.
- Kolom `inboundAlias` (unik) di `User`.
- Kolom `matchHint` (4 digit terakhir atau nama e-wallet) di `Account`.
- Tabel `PendingTransaction` dengan kolom:
  - userId
  - type
  - amount
  - date
  - merchant
  - category
  - accountId
  - externalRef (unik per user)
  - sourceBank
  - status: pending / confirmed / rejected
  - rawExpiresAt
- Modul `inbound-email`, berisi:
  - webhook dengan verifikasi tanda tangan dari layanan inbound;
  - parser per bank, dengan AI sebagai fallback;
  - endpoint `GET /pending-transactions`, `POST /pending-transactions/:id/confirm`, dan `POST /pending-transactions/:id/reject`.

**Frontend**
- Halaman **"Perlu dicek"** berisi daftar transaksi dari email, dengan tombol Simpan/Abaikan dan bisa diedit sebelum disimpan.
- Badge jumlah di menu dan di dashboard.
- Pengaturan yang menampilkan alamat forward, tombol salin, panduan membuat filter Gmail, dan tombol ganti alamat.

## Tahapan

1. [ ] Endpoint ubah dan hapus transaksi (fondasi)
2. [ ] Impor manual: tempel isi email lalu langsung diparse, bisa dites tanpa domain
3. [ ] Parser untuk 2–3 bank yang paling sering dipakai (butuh contoh email asli yang sudah disamarkan)
4. [ ] Antrean "Perlu dicek" di frontend
5. [ ] Webhook inbound dan forward otomatis

## Pertanyaan terbuka

- Bank dan e-wallet apa saja yang dipakai?
- Apakah sudah punya domain untuk alamat forward?
- Apakah boleh isi email dikirim ke penyedia AI untuk bank yang belum punya template?
