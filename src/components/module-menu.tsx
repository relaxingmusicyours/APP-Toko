import {
  Archive,
  BadgePercent,
  Banknote,
  Barcode,
  Boxes,
  Building2,
  CalendarClock,
  ChartColumn,
  ClipboardCheck,
  FileSignature,
  FileSpreadsheet,
  FolderTree,
  HandCoins,
  Landmark,
  Layers,
  LayoutGrid,
  Package,
  Percent,
  PieChart,
  PenLine,
  Plus,
  Receipt,
  RefreshCw,
  Ruler,
  ScrollText,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Undo2,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Pop-up pemilihan dokumen untuk setiap menu sidebar.
 *
 * Satu komponen dan satu daftar tile (`MODULE_MENUS`) dipakai bersama oleh
 * Kasir, Pembelian, Aset Tetap, Buku Besar, Kas & Bank, Laporan, Master Data,
 * dan Pengaturan — sama seperti pop-up Penjualan & Persediaan.
 *
 * Tile berlabel "Aktif" punya `to` (+ opsional `view`) sehingga klik langsung
 * membuka halaman dan tampilan yang diminta. Sisanya berlabel "Segera · Vx"
 * dan hanya menampilkan toast roadmap.
 */

export type Tone = "aktif" | "dokumen" | "referensi";

export interface ModuleTile {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  /** Halaman tujuan; kosong = fitur belum tersedia. */
  to?: string;
  /** Nilai `view` yang dibaca halaman tujuan lewat router state. */
  view?: string;
  roadmap?: string;
}

export interface ModuleGroup {
  tone: Tone;
  title: string;
  hint: string;
  items: ModuleTile[];
}

export type ModuleId =
  | "kasir"
  | "pembelian"
  | "aset-tetap"
  | "buku-besar"
  | "kas-bank"
  | "laporan"
  | "master-data"
  | "pengaturan";

export const MODULE_TITLES: Record<ModuleId, string> = {
  kasir: "Kasir POS",
  pembelian: "Pembelian",
  "aset-tetap": "Aset Tetap",
  "buku-besar": "Buku Besar",
  "kas-bank": "Kas & Bank",
  laporan: "Laporan",
  "master-data": "Master Data",
  pengaturan: "Pengaturan",
};

const POS = "/app/pos";
const BUY = "/app/pembelian";
const ASSET = "/app/aset-tetap";
const LEDGER = "/app/buku-besar";
const CASH = "/app/kas-bank";
const REPORT = "/app/laporan";
const MASTER = "/app/master-data";
const SETTINGS = "/app/pengaturan";

export const MODULE_MENUS: Record<ModuleId, ModuleGroup[]> = {
  kasir: [
    {
      tone: "aktif",
      title: "Aktif",
      hint: "Transaksi langsung dari halaman kasir",
      items: [
        { id: "kasir", label: "Faktur Kasir", icon: ShoppingCart, tone: "aktif", to: POS },
        { id: "pelanggan-kasir", label: "Pelanggan di Kasir", icon: Users, tone: "aktif", to: MASTER, view: "pelanggan" },
      ],
    },
    {
      tone: "dokumen",
      title: "Dokumen Kasir",
      hint: "Fitur lanjutan sesuai skala kasir",
      items: [
        { id: "retur-kasir", label: "Retur Penjualan Kasir", icon: Undo2, tone: "dokumen", roadmap: "V2" },
        { id: "split-payment", label: "Split Payment", icon: HandCoins, tone: "dokumen", roadmap: "V2" },
        { id: "voucher", label: "Diskon & Voucher", icon: BadgePercent, tone: "dokumen", roadmap: "V2" },
        { id: "tahan-kasir", label: "Tahan / Bayar Susulan", icon: CalendarClock, tone: "dokumen", roadmap: "V2" },
      ],
    },
    {
      tone: "referensi",
      title: "Referensi",
      hint: "Data yang dipakai saat transaksi kasir",
      items: [
        { id: "produk-harga", label: "Produk & Harga", icon: Package, tone: "referensi", to: MASTER, view: "barang" },
        { id: "metode-bayar", label: "Metode Pembayaran", icon: Wallet, tone: "referensi", to: CASH },
      ],
    },
  ],

  pembelian: [
    {
      tone: "aktif",
      title: "Aktif",
      hint: "Procure-to-pay: dari faktur sampai pembayaran",
      items: [
        { id: "faktur", label: "Faktur Pembelian", icon: Truck, tone: "aktif", to: BUY, view: "form" },
        { id: "pembayaran", label: "Pembayaran ke Suppliers", icon: Banknote, tone: "aktif", to: BUY, view: "posted" },
        { id: "riwayat", label: "Riwayat Pembelian", icon: FileSpreadsheet, tone: "aktif", to: BUY, view: "all" },
      ],
    },
    {
      tone: "dokumen",
      title: "Dokumen Pembelian",
      hint: "Siklus pemesanan barang dagang",
      items: [
        { id: "order-purchase", label: "Order Purchase", icon: ClipboardCheck, tone: "dokumen", roadmap: "V2" },
        { id: "penerimaan", label: "Penerimaan Barang", icon: Archive, tone: "dokumen", roadmap: "V2" },
        { id: "retur-pembelian", label: "Retur Pembelian", icon: Undo2, tone: "dokumen", roadmap: "V2" },
        { id: "permintaan", label: "Permintaan Pembelian", icon: FileSignature, tone: "dokumen", roadmap: "V2" },
      ],
    },
    {
      tone: "referensi",
      title: "Referensi",
      hint: "Master data pendukung pembelian",
      items: [
        { id: "pemasok", label: "Pemasok", icon: Building2, tone: "referensi", to: MASTER, view: "pemasok" },
      ],
    },
  ],

  "aset-tetap": [
    {
      tone: "aktif",
      title: "Aktif",
      hint: "Perolehan, daftar, dan jadwal penyusutan",
      items: [
        { id: "perolehan", label: "Perolehan Aset Tetap", icon: Building2, tone: "aktif", to: ASSET, view: "acquire" },
        { id: "daftar", label: "Daftar Aset", icon: Boxes, tone: "aktif", to: ASSET, view: "daftar" },
        { id: "jadwal", label: "Jadwal Penyusutan", icon: CalendarClock, tone: "aktif", to: ASSET, view: "jadwal" },
        { id: "penyusutan", label: "Jalankan Penyusutan", icon: RefreshCw, tone: "aktif", to: ASSET, view: "dep" },
      ],
    },
    {
      tone: "dokumen",
      title: "Dokumen Aset",
      hint: "Penjualan dan penyesuaian aset",
      items: [
        { id: "jual-aset", label: "Jual Aset", icon: Receipt, tone: "dokumen", roadmap: "V2" },
        { id: "perhitungan", label: "Perhitungan Aset", icon: FileSpreadsheet, tone: "dokumen", roadmap: "V2" },
      ],
    },
    {
      tone: "referensi",
      title: "Referensi",
      hint: "Pengelompokan aset dan metode penyusutan",
      items: [
        { id: "grup-aset", label: "Grup & Afiliasi Aset", icon: FolderTree, tone: "referensi", roadmap: "V2" },
        { id: "metode-penyusutan", label: "Metode Penyusutan", icon: Percent, tone: "referensi", roadmap: "V2" },
      ],
    },
  ],

  "buku-besar": [
    {
      tone: "aktif",
      title: "Aktif",
      hint: "Semua jurnal Double-entry dari satu sumber ledger",
      items: [
        { id: "jurnal", label: "Jurnal Umum", icon: ScrollText, tone: "aktif", to: LEDGER, view: "jurnal" },
        { id: "buku-akun", label: "Buku per Akun", icon: Layers, tone: "aktif", to: LEDGER, view: "buku" },
        { id: "coa", label: "Chart of Accounts", icon: LayoutGrid, tone: "aktif", to: LEDGER, view: "coa" },
        { id: "jurnal-manual", label: "Buat Jurnal Manual", icon: PenLine, tone: "aktif", to: LEDGER, view: "form" },
      ],
    },
    {
      tone: "referensi",
      title: "Referensi",
      hint: "Jejak audit dan aturan pembukuan",
      items: [
        { id: "audit", label: "Audit Trail", icon: ShieldCheck, tone: "referensi", to: SETTINGS, view: "audit" },
        { id: "preferensi", label: "Preferensi Buku", icon: Settings2, tone: "referensi", to: SETTINGS, view: "preferensi" },
      ],
    },
  ],

  "kas-bank": [
    {
      tone: "aktif",
      title: "Aktif",
      hint: "Penerimaan, pengeluaran, dan transfer antar rekening",
      items: [
        { id: "transaksi", label: "Riwayat Transaksi", icon: Wallet, tone: "aktif", to: CASH, view: "transaksi" },
        { id: "transaksi-baru", label: "Transaksi Baru", icon: Plus, tone: "aktif", to: CASH, view: "form" },
      ],
    },
    {
      tone: "dokumen",
      title: "Dokumen Kas",
      hint: "Alur kas harian dan rekonsiliasi",
      items: [
        { id: "kas-harian", label: "Kas Harian", icon: Barcode, tone: "dokumen", roadmap: "V2" },
        { id: "rekonsiliasi", label: "Rekonsiliasi Bank", icon: RefreshCw, tone: "dokumen", roadmap: "V2" },
        { id: "mutasi-bank", label: "Import Mutasi Bank", icon: Landmark, tone: "dokumen", roadmap: "V2" },
      ],
    },
    {
      tone: "referensi",
      title: "Referensi",
      hint: "Akun kas dan bank",
      items: [
        { id: "rekening", label: "Chart of Accounts", icon: LayoutGrid, tone: "referensi", to: LEDGER, view: "coa" },
      ],
    },
  ],

  laporan: [
    {
      tone: "aktif",
      title: "Laporan Keuangan",
      hint: "Neraca, laba rugi, arus kas, dan trial balance",
      items: [
        { id: "neraca", label: "Neraca", icon: LayoutGrid, tone: "aktif", to: REPORT, view: "neraca" },
        { id: "labarugi", label: "Laba Rugi", icon: ChartColumn, tone: "aktif", to: REPORT, view: "labarugi" },
        { id: "aruskas", label: "Arus Kas", icon: PieChart, tone: "aktif", to: REPORT, view: "aruskas" },
        { id: "trial", label: "Trial Balance", icon: ClipboardCheck, tone: "aktif", to: REPORT, view: "trial" },
      ],
    },
    {
      tone: "dokumen",
      title: "Analisis & Register",
      hint: "Umur piutang/utang, PPN, dan register aset",
      items: [
        { id: "ar-aging", label: "Umur Piutang", icon: FileSpreadsheet, tone: "dokumen", to: REPORT, view: "ar-aging" },
        { id: "ap-aging", label: "Umur Utang", icon: FileSpreadsheet, tone: "dokumen", to: REPORT, view: "ap-aging" },
        { id: "ppn", label: "Ringkasan PPN", icon: Percent, tone: "dokumen", to: REPORT, view: "ppn" },
        { id: "register-aset", label: "Register Aset", icon: Building2, tone: "dokumen", to: REPORT, view: "assets" },
      ],
    },
    {
      tone: "referensi",
      title: "Analisis Penjualan & Pembelian",
      hint: "Rekap per pihak dan per produk",
      items: [
        { id: "sales-customer", label: "Penjualan per Pelanggan", icon: Users, tone: "referensi", to: REPORT, view: "sales-customer" },
        { id: "sales-product", label: "Penjualan per Produk", icon: Package, tone: "referensi", to: REPORT, view: "sales-product" },
        { id: "purchase-supplier", label: "Pembelian per Pemasok", icon: Building2, tone: "referensi", to: REPORT, view: "purchase-supplier" },
      ],
    },
  ],

  "master-data": [
    {
      tone: "aktif",
      title: "Aktif",
      hint: "Master data yang dipakai semua modul",
      items: [
        { id: "pelanggan", label: "Pelanggan", icon: Users, tone: "aktif", to: MASTER, view: "pelanggan" },
        { id: "pemasok", label: "Pemasok", icon: Building2, tone: "aktif", to: MASTER, view: "pemasok" },
        { id: "barang", label: "Barang & Jasa", icon: Package, tone: "aktif", to: MASTER, view: "barang" },
        { id: "gudang", label: "Gudang", icon: Warehouse, tone: "aktif", to: MASTER, view: "gudang" },
      ],
    },
    {
      tone: "referensi",
      title: "Referensi & Kategori",
      hint: "Pengelompokan barang dagang",
      items: [
        { id: "kategori-pelanggan", label: "Kategori Pelanggan", icon: Tags, tone: "referensi", roadmap: "V2" },
        { id: "kategori-barang", label: "Kategori Barang", icon: Tags, tone: "referensi", roadmap: "V2" },
        { id: "satuan", label: "Satuan", icon: Ruler, tone: "referensi", roadmap: "V2" },
        { id: "merek", label: "Merek & Golongan", icon: Barcode, tone: "referensi", roadmap: "V2" },
      ],
    },
  ],

  pengaturan: [
    {
      tone: "aktif",
      title: "Aktif",
      hint: "Alat dan preferensi perusahaan",
      items: [
        { id: "preferensi", label: "Preferensi", icon: Settings2, tone: "aktif", to: SETTINGS, view: "preferensi" },
        { id: "akses-grup", label: "Akses Grup", icon: Users, tone: "aktif", to: SETTINGS, view: "akses-grup" },
        { id: "pengguna", label: "Pengguna", icon: UsersRound, tone: "aktif", to: SETTINGS, view: "pengguna" },
        { id: "desain-cetakan", label: "Desain Cetakan", icon: FileSignature, tone: "aktif", to: SETTINGS, view: "desain-cetakan" },
      ],
    },
    {
      tone: "dokumen",
      title: "Perusahaan & Sistem",
      hint: "Profil, akun, jejak audit, dan rencana produk",
      items: [
        { id: "perusahaan", label: "Perusahaan", icon: Building2, tone: "dokumen", to: SETTINGS, view: "perusahaan" },
        { id: "akun", label: "Chart of Accounts", icon: LayoutGrid, tone: "dokumen", to: SETTINGS, view: "akun" },
        { id: "audit", label: "Audit Trail", icon: ShieldCheck, tone: "dokumen", to: SETTINGS, view: "audit" },
        { id: "roadmap", label: "Roadmap", icon: ChartColumn, tone: "dokumen", to: SETTINGS, view: "roadmap" },
        { id: "backlog", label: "Backlog & QA", icon: ClipboardCheck, tone: "dokumen", to: SETTINGS, view: "backlog" },
        { id: "integrasi", label: "Integrasi", icon: Layers, tone: "dokumen", to: SETTINGS, view: "integrasi" },
      ],
    },
    {
      tone: "referensi",
      title: "Add On",
      hint: "Katalog integrasi pihak ketiga",
      items: [
        { id: "add-on", label: "Add On", icon: Store, tone: "referensi", roadmap: "V3" },
      ],
    },
  ],
};

const TONE_STYLES: Record<Tone, { card: string; icon: string; ring: string }> = {
  aktif: {
    card: "border-emerald-500/30 bg-emerald-500/[0.04] hover:border-emerald-500/60 hover:bg-emerald-500/[0.08]",
    icon: "bg-emerald-500/10 text-emerald-600",
    ring: "bg-emerald-500",
  },
  dokumen: {
    card: "border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/60 hover:bg-amber-500/[0.08]",
    icon: "bg-amber-500/10 text-amber-600",
    ring: "bg-amber-500",
  },
  referensi: {
    card: "border-sky-500/30 bg-sky-500/[0.04] hover:border-sky-500/60 hover:bg-sky-500/[0.08]",
    icon: "bg-sky-500/10 text-sky-600",
    ring: "bg-sky-500",
  },
};

export function ModuleMenu({
  module,
  onSelect,
}: {
  module: ModuleId;
  onSelect: (tile: ModuleTile) => void;
}) {
  return (
    <div className="space-y-3">
      {MODULE_MENUS[module].map((group) => {
        const styles = TONE_STYLES[group.tone];
        return (
          <section key={group.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <span className={cn("h-2.5 w-2.5 rounded-full", styles.ring)} />
                {group.title}
              </h2>
              <span className="text-xs text-muted-foreground">{group.hint}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {group.items.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => onSelect(tile)}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    styles.card,
                  )}
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-xl transition-transform group-hover:scale-110",
                      styles.icon,
                    )}
                  >
                    <tile.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-foreground">
                    {tile.label}
                  </span>
                  {tile.to ? (
                    <Badge variant="success" className="text-[10px]">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Segera · {tile.roadmap}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Aksi default untuk tile: buka halaman tujuan, atau jelaskan roadmap. */
export function handleTile(tile: ModuleTile, go: (to: string, view?: string) => void) {
  if (!tile.to) {
    toast.info(`${tile.label} belum tersedia`, {
      description: `Fitur ini masuk roadmap ${tile.roadmap ?? "berikutnya"} — sementara pakai alur yang sudah ada.`,
    });
    return;
  }
  go(tile.to, tile.view);
}

export default ModuleMenu;