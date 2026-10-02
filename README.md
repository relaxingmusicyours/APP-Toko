# POS GG Online

Kasir (POS), penjualan, pembelian, persediaan, dan akuntansi **double-entry** dalam satu aplikasi
untuk bisnis Indonesia — dibangun mengikuti struktur modul ERP akuntansi (referensi: Accurate Online).

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn-style components
- **Backend/DB**: Convex (functions + database, multi-tenant per user)
- **Auth**: Convex Auth (email + password)
- **Charts**: Recharts • Motion: Framer Motion • Toast: Sonner

## Modul

| Modul | Isi |
| --- | --- |
| Kasir POS | Grid produk, keranjang, diskon, tunai/QRIS/transfer, kembalian, struk cetak |
| Penjualan | Faktur (order-to-cash), penerimaan pembayaran, void + reversal, piutang |
| Pembelian | Faktur pemasok (procure-to-pay), pembayaran, void, utang |
| Persediaan | Multi-gudang, kartu stok (ledger), stok opname → jurnal selisih, stok minimum |
| Aset Tetap | Register aset, perolehan berjurnal, penyusutan bulatan (garis lurus / saldo menurun), disposal + laba/rugi |
| Buku Besar | Chart of accounts, jurnal umum manual (validasi debit = kredit), buku per akun |
| Kas & Bank | Penerimaan, pengeluaran, transfer antar rekening |
| Laporan | Neraca, Laba Rugi, Arus Kas, Trial Balance, AR/AP Aging, Penjualan per Pelanggan & per Produk, Pembelian per Pemasok, Ringkasan PPN, Register Aset — filter periode & export CSV |
| Master Data | Pelanggan, pemasok, barang & jasa (biaya rata-rata bergerak), gudang |
| Pengaturan | Profil perusahaan, COA tambahan, audit trail, roadmap, backlog P0–P2 & checklist QA (§26–§27) |

## Accounting engine

Semua dokumen bisnis diposting lewat satu entry point (`src/convex/lib/posting.ts`):

- Validasi **debit = kredit** sebelum tersimpan; jurnal tidak seimbang ditolak.
- Faktur penjualan → Piutang (D), Pendapatan + PPN Keluaran (K), plus HPP (D) / Persediaan (K).
- Faktur pembelian → Persediaan + PPN Masukan (D), Utang Usaha (K); biaya rata-rata bergerak diperbarui.
- Retur penjualan → Pendapatan + PPN (D), Piutang (K), plus pembalikan HPP bila barang kembali ke gudang.
- Perolehan aset tetap → Aset Tetap (D), Kas/Bank/Utang (K); penyusutan → Beban Penyusutan (D) / Akumulasi Penyusutan (K).
- Penjualan aset → hapus Akumulasi + Aset Tetap, selisih masuk Rugi/Laba Penjualan Aset.
- Void → jurnal reversal otomatis + pengembalian stok.
- Stok opname → jurnal Selisih Persediaan otomatis.

Setiap posting terekam di **audit trail** (siapa, kapan, apa).

## Mode Demo Tamu (tanpa login)

Rute `/#/guest` terbuka untuk publik tanpa akun — dapat diakses dari landing page ("Buka Mode Demo
gratis") maupun dari halaman auth, tepat di bawah tombol Daftar & mulai.

Tamu bisa menjelajah **seluruh menu program**: Dashboard, Kasir POS, Penjualan, Pembelian,
Persediaan, Aset Tetap, Buku Besar, Kas & Bank, Laporan, dan Master Data.

- **Batas 10 transaksi kasir per browser.** Setelah kuota habis, banner merah muncul, tombol
  checkout dinonaktifkan, dan transaksi berikutnya hanya bisa dilakukan setelah masuk/daftar.
  Tombol **Reset demo** mengembalikan kuota.
- Seluruh angka modul diturunkan dari satu dataset contoh (`src/lib/demo-data.ts`) yang
  menghasilkan jurnal double-entry nyata, sehingga penjualan di dashboard = kas masuk = laba rugi
  di laporan, dan saldo akun persediaan selalu sama dengan kartu stok.
- Transaksi kasir tamu disimpan di `localStorage` (kunci `posgg:guest-sales:v1`) dan **sengaja
  tidak menyentuh Convex**, sehingga tamu tidak pernah bisa membaca atau mengubah data bisnis
  mana pun. Tanggal beberapa faktur dibuat relatif terhadap hari ini agar demo aging (0–14,
  15–30, >30 hari) selalu relevan.

Untuk produksi, transaksi tetap harus lewat workspace ber-login (dengan tenant, stok, dan jurnal
double-entry penuh).

## Menjalankan

```bash
bun install
bun dev            # frontend (Vite)
bun convex dev --once   # codegen + push fungsi Convex
```

Env yang diperlukan (lihat Freebuff Settings, lalu Environment):

| Key | Dipakai oleh | Keterangan |
| --- | --- | --- |
| `VITE_CONVEX_URL` | browser | URL deployment Convex, mis. `https://adjective-noun-123.convex.cloud` |
| `CONVEX_DEPLOYMENT` | CLI | nama deployment, mis. `adjective-noun-123:abc123` |
| `CONVEX_ADMIN_KEY` | CLI | admin key dari dashboard Convex, **jangan** diberi prefix `VITE_` agar tidak terkirim ke browser |

### Menghubungkan database Convex

Middleware `Masuk` dan `Daftar` membutuhkan deployment Convex yang bisa dijangkau internet. Selama
CLI belum terhubung ke akun Convex, `CONVEX_DEPLOYMENT` bernilai `anonymous:*` dan
`VITE_CONVEX_URL` menunjuk ke `localhost` — akibatnya seluruh permintaan dari browser (login,
daftar, query, mutasi) gagal. Aplikasi mendeteksi kondisi ini dan menampilkan banner
**Backend belum terhubung** di halaman auth.

Langkah pennyambungan:

1. Di terminal workspace: `npx convex login` (meminta login di browser), lalu
   `npx convex dev --once` — CLI akan membuat deployment cloud baru dan mencetak nilainya.
2. Salin nilainya ke Settings, lalu Environment: `VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`, dan
   `CONVEX_ADMIN_KEY`.
3. Restart preview, lalu uji Daftar dan Masuk dari ujung ke ujung.

Selama belum terhubung, **Mode Demo** (`/#/guest`) tetap berfungsi penuh karena tidak memakai
backend.

Akun baru otomatis mendapat Chart of Accounts, master data contoh, dan saldo awal.
