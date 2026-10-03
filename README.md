# POS GG Online

Kasir (POS), penjualan, pembelian, persediaan, dan akuntansi **double-entry** dalam satu aplikasi
untuk bisnis Indonesia — dibangun mengikuti struktur modul ERP akuntansi.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn-style components
- **Backend/DB**: Convex (functions + database, multi-tenant per user)
- **Auth**: Convex Auth (email + password)
- **Charts**: Recharts • Motion: Framer Motion • Toast: Sonner

## Modul

| Modul | Isi |
| --- | --- |
| Kasir POS | Grid produk, keranjang, diskon, tunai/QRIS/transfer, kembalian, struk cetak |
| Penjualan | Menu dokumen (penawaran → pesanan → pengiriman → uang muka → faktur → penerimaan → retur, plus dokumen khusus), faktur order-to-cash, penerimaan pembayaran, void + reversal, piutang |
| Pembelian | Faktur pemasok (procure-to-pay), pembayaran, void, utang |
| Persediaan | Multi-gudang, kartu stok (ledger), stok opname → jurnal selisih, stok minimum |
| Aset Tetap | Register aset, perolehan berjurnal, penyusutan bulatan (garis lurus / saldo menurun), disposal + laba/rugi |
| Buku Besar | Chart of accounts, jurnal umum manual (validasi debit = kredit), buku per akun |
| Kas & Bank | Penerimaan, pengeluaran, transfer antar rekening |
| Laporan | Neraca, Laba Rugi, Arus Kas, Trial Balance, AR/AP Aging, Penjualan per Pelanggan & per Produk, Pembelian per Pemasok, Ringkasan PPN, Register Aset — filter periode & export CSV |
| Master Data | Pelanggan, pemasok, barang & jasa (biaya rata-rata bergerak), gudang |
| Pengaturan | Menu Alat (Preferensi, Akses Grup, Pengguna, Desain Cetakan), profil perusahaan, COA tambahan, audit trail, roadmap, backlog P0–P2 & checklist QA (§26–§27), kosongkan database |

## Navigasi pop-up sidebar

Ikon sidebar (kecuali Dashboard) tidak lagi membuka halaman secara langsung. Klik ikon → muncul
pop-up berisi **kotak dokumen** untuk modul itu, dan halaman di bawahnya tetap di tampilan terakhir
sampai kamu memilih salah satu kotak. Menutup pop-up tidak mengubah apa pun.

Daftar tile tiap modul ada di satu tempat: `src/components/module-menu.tsx` (`MODULE_MENUS`), plus
dua komponen khusus untuk Penjualan (`sales-menu.tsx`) dan Persediaan (`inventory-menu.tsx`).

| Pop-up | Tile "Aktif" |
| --- | --- |
| Kasir POS | Faktur Kasir, Pelanggan di Kasir, Produk & Harga, Metode Pembayaran |
| Pembelian | Faktur Pembelian, Pembayaran ke Suppliers, Riwayat, Pemasok |
| Aset Tetap | Perolehan, Daftar Aset, Jadwal Penyusutan, Jalankan Penyusutan |
| Buku Besar | Jurnal Umum, Buku per Akun, Chart of Accounts, Buat Jurnal Manual, Audit Trail |
| Kas & Bank | Riwayat Transaksi, Transaksi Baru |
| Laporan | 11 laporan (Neraca, Laba Rugi, Arus Kas, Trial, Aging, PPN, Register Aset, rekap penjualan/pembelian) |
| Master Data | Pelanggan, Pemasok, Barang & Jasa, Gudang |
| Pengaturan | Preferensi, Akses Grup, Pengguna, Desain Cetakan, Perusahaan, COA, Audit, Roadmap, Backlog, Integrasi |

Kotak bertanda **Aktif** membuka halaman tujuan plus tampilan yang diminta (tab atau dialog),
mis. "Faktur Pembelian" → `/app/pembelian` dengan form faktur terbuka. Kotak **Segera · V2/V3**
menampilkan toast roadmap. Mekanismenya: `navigate(path, { state: { view } })` +
hook `useViewTarget` (`src/lib/view-target.ts`) yang menjalankan aksi lalu membersihkan state.

## Menu Alat (Pengaturan)

`src/components/settings-tools.tsx` menampilkan grid 5 tile di atas halaman
Pengaturan, persis seperti pada aplikasi pembanding:

| Tile | Isi |
| --- | --- |
| **Preferensi** | Tahun buku, mata uang, format tanggal, PPN default, peringatan stok menipis |
| **Akses Grup** | Ringkasan hak akses tiap peran (pemilik, manajer, kasir, pembukuan) + jumlah anggotanya |
| **Pengguna** | Daftar anggota tim, status aktif/belum masuk, ubah status, hapus, dan undangan baru |
| **Desain Cetakan** | Lebar struk (58/80 mm), footer, Kop, rincian PPN + pratinjau struk |
| **Add On** | Katalog integrasi & add-on pihak ketiga — badge **Segera**, klik menampilkan toast roadmap V3 |

Data disimpan di dua tempat: preferensi & desain cetakan pada tabel `companies`, anggota tim pada
tabel `companyMembers` (backend: `src/convex/preferences.ts`). Hanya **pemilik** perusahaan yang
bisa mengundang, menonaktifkan, atau menghapus anggota — akun pemilik sendiri tersimpan otomatis
sebagai anggota peran `owner` dan tidak bisa dihapus. Semua perubahan tercatat di audit trail.

## Menu Penjualan

Halaman `/app/penjualan` membuka `src/components/sales-menu.tsx` — kumpulan dokumen penjualan
berbentuk grid, dikelompokkan menurut warna:

| Kelompok | Isi |
| --- | --- |
| **Transaksi Penjualan** (hijau) | Penawaran, Pesanan, Pengiriman, Uang Muka, Faktur, Penerimaan, Retur, Tukar Faktur, Klaim Pelanggan, Peng evidenced Barang |
| **Data Pendukung** (biru) | Kategori Pelanggan, Kategori Penjualan, Pelanggan |
| **Dokumen Khusus** (kuning) | Penyesuaian Harga/Diskon, Komisi Penjualan, Target Penjualan, SmartLink e-Commerce |

Item yang alurnya sudah ada (Faktur, Penerimaan, Retur, Pelanggan) berlabel **Aktif** dan bisa
diklik. Sisanya berlabel **Segera · V2/V3** sesuai tahapnya di roadmap `src/pages/settings.tsx`
dan menampilkan toast singkat saat diklik — jadi menu ini jadi peta fitur tanpa navigasi yang
buntu.

## Menu Persediaan

Halaman `/app/persediaan` membuka `src/components/inventory-menu.tsx` — grid dokumen
persediaan dengan tiga kelompok warna:

| Kelompok | Isi |
| --- | --- |
| **Aktif** (hijau) | Kartu Stok, Riwayat Pergerakan, Perintah Stock Opname, Hasil Stock Opname |
| **Dokumen Persediaan** (kuning) | Pemindahan Barang, Penyesuaian Persediaan, Pekerjaan Pesanan, Pemindahan Bahan Baku, Penyesuaian Pesanan, Pengisian Nomor Seri |
| **Referensi** (biru) | Referensi Barang, Kategori Barang, Satuan |

Kotak yang alurnya sudah ada bisa diklik dan menggantikan tab "Kartu Stok" / "Riwayat Pergerakan";
sisanya berlabel **Segera · V2/V3** dan menampilkan toast singkat. Kartu stok yang sedang
dibuka ditandai cincin hijau.

## Database kosong & akun demo

Workspace baru **tidak** diisi data contoh. Saat pendaftaran, `ensureCompany` hanya membuat
Chart of Accounts sistem dan satu **Gudang Utama**; seluruh master data (pelanggan, pemasok,
barang) dan saldo awal kosong, lalu diisi pengguna sendiri lewat menu Master Data.

Tiga cara mulai dari nol:

| Cara | Perilaku |
| --- | --- |
| **Akun demo** (tombol di halaman masuk) | Masuk ke akun bersama, lalu database demo **dihapus** otomatis tiap sesi (`api.company.prepareDemo`) |
| **Pengaturan → Kosongkan database** | Menghapus transaksi, jurnal, dan master data milik tenant; COA + Gudang Utama tetap ada (`api.company.clearWorkspace`) |
| **Mode Demo tamu** (`/#/guest`) | Tidak menyentuh Convex sama sekali — data contoh statis di `src/lib/demo-data.ts` |

## Tutorial klik setiap menu

`src/components/tutorial.tsx` memandu pengguna menu demi menu (Dashboard, Master Data, Kasir,
Penjualan, Pembelian, Persediaan, Aset Tetap, Kas & Bank, Buku Besar, Laporan, Pengaturan).
Tiap langkah memindahkan halaman secara otomatis, menyebutkan tombol yang harus diklik, dan
menampilkan tombol **Lewati tutorial** di setiap langkah. Status disimpan di `localStorage`
(kunci `posgg:tutorial:v1`) supaya tidak muncul berulang; bisa diputar ulang dari sidebar atau
**Pengaturan → Mulai tutorial**.

## Env untuk integrasi GitHub (opsional)

| Key | Keterangan |
| --- | --- |
| `GITHUB_TOKEN` | Token GitHub, dibaca di backend (Node runtime) untuk kartu status integrasi |
| `GITHUB_REPOSITORY` | Format `owner/repo`, mis. `relaxingmusicyours/APP-Toko` |

Tanpa key tersebut, kartu di **Pengaturan → Integrasi** tetap tampil dan menjelaskan fitur apa
saja yang harus diaktifkan manual di GitHub.

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

Akun baru otomatis mendapat Chart of Accounts sistem dan satu Gudang Utama. Master data dan
saldo awal sengaja dibiarkan kosong — isi sendiri lewat Master Data, atau ikuti tutorial.
