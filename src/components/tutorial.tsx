import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Lightbulb,
  MapPin,
  PartyPopper,
  PlayCircle,
  X,
} from "lucide-react";
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Tutorial klik-tiap-menu.
 *
 * Satu langkah = satu layar aplikasi + beberapa instruksi klik singkat.
 * "Lewati tutorial" tersedia di setiap langkah, jadi pengguna boleh berhenti
 * kapan saja tanpa harus menyelesaikan semua menu.
 */

interface TutorialStep {
  /** Route yang dibuka otomatis saat langkah ini aktif. */
  path: string;
  /** Nama menu di sidebar. */
  menu: string;
  title: string;
  /** Poin yang harus diklik pengguna di layar ini. */
  actions: string[];
  tip?: string;
}

const STEPS: TutorialStep[] = [
  {
    path: "/app",
    menu: "Dashboard",
    title: "Mulai dari Dashboard",
    actions: [
      "Lihat 4 kartu KPI: penjualan, laba/rugi, saldo kas & bank, dan nilai persediaan.",
      "Grafik 6 bulan membandingkan penjualan dengan pembelian.",
      "Kartu bawah menampilkan umur piutang, stok menipis, dan faktur terbaru.",
    ],
    tip: "Semua angka dihitung dari jurnal, bukan diinput manual.",
  },
  {
    path: "/app/master-data",
    menu: "Master Data",
    title: "Isi Barang & Jasa dulu",
    actions: [
      'Pilih tab "Barang & Jasa".',
      'Klik tombol "+ Barang" di kanan atas.',
      "Isi Nama, Satuan, Harga Jual, Harga Beli, dan PPN.",
      'Centang "Lacak stok" untuk barang; hilangkan untuk jasa.',
      "Klik Simpan.",
    ],
    tip: "Kosongkan SKU bila ingin penomoran otomatis. Tanpa barang, Kasir POS belum bisa dipakai.",
  },
  {
    path: "/app/master-data",
    menu: "Master Data",
    title: "Pelanggan, Pemasok, Gudang",
    actions: [
      'Tab "Pelanggan" untuk mencatat piutang penjualan.',
      'Tab "Pemasok" untuk mencatat utang pembelian.',
      'Tab "Gudang" bila punya lebih dari satu lokasi stok.',
      'Satu "Gudang Utama" sudah dibuat otomatis saat workspace dibuat.',
    ],
  },
  {
    path: "/app/pos",
    menu: "Kasir POS",
    title: "Transaksi pertama di kasir",
    actions: [
      "Klik kartu produk untuk menambah ke keranjang.",
      "Gunakan tombol +/- untuk mengubah qty, isi Diskon bila perlu.",
      "Pilih gudang dan pelanggan (opsional).",
      'Klik "Bayar", pilih metode, lalu "Selesaikan & Cetak".',
    ],
    tip: "Stok berkurang dan jurnal Piutang, Pendapatan, PPN, dan HPP terbentuk otomatis.",
  },
  {
    path: "/app/penjualan",
    menu: "Penjualan",
    title: "Faktur penjualan non-kasir",
    actions: [
      'Klik "Faktur Baru" untuk penjualan dengan termin piutang.',
      'Tab "Belum Lunas" menampilkan tagihan yang masih berjalan.',
      "Ikon rantai untuk menerima pembayaran, ikon retur untuk mengembalikan barang.",
      "Void membalik jurnal dan mengembalikan stok.",
    ],
  },
  {
    path: "/app/pembelian",
    menu: "Pembelian",
    title: "Faktur pembelian dan utang",
    actions: [
      'Klik "Faktur Pembelian Baru" lalu pilih pemasok.',
      'Klik "Tambah Baris" untuk mengisi barang dan harga beli.',
      "Simpan, lalu stok naik dan biaya rata-rata bergerak dihitung ulang.",
      "Bayar utang lewat tombol di kolom Aksi.",
    ],
  },
  {
    path: "/app/persediaan",
    menu: "Persediaan",
    title: "Kartu stok dan opname",
    actions: [
      'Kotak "Kartu Stok" untuk melihat saldo per barang.',
      'Kotak "Riwayat Pergerakan" untuk menelusuri tiap mutasi stok.',
      'Kotak "Perintah Stock Opname" untuk mencocokkan stok fisik — selisihnya jadi jurnal koreksi.',
    ],
  },
  {
    path: "/app/aset-tetap",
    menu: "Aset Tetap",
    title: "Aset dan penyusutan",
    actions: [
      '"Perolehan Aset Tetap" mencatat pembelian dan langsung berjurnal.',
      "Pilih metode garis lurus atau saldo menurun.",
      '"Jalankan Penyusutan Bulanan" mem-posting beban tiap bulan.',
      '"Jual Aset" menghasilkan laba atau rugi penjualan aset.',
    ],
  },
  {
    path: "/app/kas-bank",
    menu: "Kas & Bank",
    title: "Penerimaan, pengeluaran, transfer",
    actions: [
      'Klik "Transaksi Baru" untuk penerimaan, pengeluaran, atau transfer.',
      "Pilih akun kas/bank tujuan dan akun lawan.",
      "Semua arus kas tercatat sebagai jurnal dan langsung masuk laporan.",
    ],
  },
  {
    path: "/app/buku-besar",
    menu: "Buku Besar",
    title: "Jurnal dan akun",
    actions: [
      'Tab "Jurnal Umum" untuk membuat jurnal manual.',
      '"Tambah Baris" — sistem menolak jurnal yang tidak seimbang.',
      'Tab "Chart of Accounts" untuk menambah akun.',
      'Tab "Buku per Akun" untuk melihat saldo berjalan per akun.',
    ],
  },
  {
    path: "/app/laporan",
    menu: "Laporan",
    title: "Laporan keuangan",
    actions: [
      "Atur periode Dari Tanggal dan Sampai Tanggal.",
      "Pilih tab: Neraca, Laba Rugi, Arus Kas, Trial Balance, aging, dan lainnya.",
      "Tombol export mengunduh tabel sebagai CSV.",
    ],
    tip: "Semua laporan diturunkan dari satu sumber ledger yang sama.",
  },
  {
    path: "/app/pengaturan",
    menu: "Pengaturan",
    title: "Profil, COA, dan audit",
    actions: [
      "Semua pengaturan dibuka lewat kotak di bagian atas halaman — tidak ada tab.",
      'Kotak "Perusahaan" untuk nama toko, NPWP, alamat, dan telepon.',
      'Kotak "Chart of Accounts" untuk menambah akun pembantu.',
      'Kotak "Preferensi" untuk tahun buku, format tanggal, dan PPN default.',
      'Kotak "Audit Trail" melihat siapa memposting apa dan kapan.',
      'Kotak "Pengguna" untuk mengelola anggota tim.',
    ],
  },
];

const STORAGE_KEY = "posgg:tutorial:v1";
const START_EVENT = "posgg:tutorial:start";

/** Memicu tutorial dari komponen mana pun di aplikasi. */
export function launchTutorial() {
  window.dispatchEvent(new Event(START_EVENT));
}

/**
 * Pembungkus aplikasi: menyimpan status "tutorial sudah pernah ditutup"
 * sehingga tutorial tidak muncul lagi di browser yang sama.
 */
export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      // True = belum pernah ditutup, jadi tampilkan sekali di awal.
      setDismissed(window.localStorage.getItem(STORAGE_KEY) !== null);
    } catch {
      setDismissed(true);
    }
  }, []);

  const markDone = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // localStorage diblokir — tutorial tetap bisa dipakai di sesi ini.
    }
    setDismissed(true);
  }, []);

  const value = React.useMemo(
    () => ({ autoOpen: !dismissed, start: launchTutorial, markDone }),
    [dismissed, markDone],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <TutorialOverlay />
    </TutorialContext.Provider>
  );
}

interface TutorialContextValue {
  /** True saat tutorial belum pernah ditutup di browser ini. */
  autoOpen: boolean;
  start: () => void;
  markDone: () => void;
}

const TutorialContext = React.createContext<TutorialContextValue | null>(null);

function useTutorial(): TutorialContextValue {
  return (
    React.useContext(TutorialContext) ?? {
      autoOpen: false,
      start: launchTutorial,
      markDone: () => {},
    }
  );
}

function TutorialOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { autoOpen, markDone, start } = useTutorial();

  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const show = React.useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  const stop = React.useCallback(() => {
    setOpen(false);
    markDone();
  }, [markDone]);

  // Buka otomatis saat workspace baru dipakai.
  React.useEffect(() => {
    if (autoOpen) show();
  }, [autoOpen, show]);

  // Tombol "Mulai tutorial" di halaman lain memancing overlay ini.
  React.useEffect(() => {
    const handler = () => show();
    window.addEventListener(START_EVENT, handler);
    return () => window.removeEventListener(START_EVENT, handler);
  }, [show]);

  // Ikuti route langkah yang sedang aktif.
  React.useEffect(() => {
    if (!open) return;
    const step = STEPS[index];
    if (step && location.pathname !== step.path) navigate(step.path);
  }, [open, index, location.pathname, navigate]);

  // Escape = lewati, panah kiri/kanan = pindah langkah.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(STEPS.length - 1, i + 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, stop]);

  if (!open) {
    // Renderer invisibel: tombol pemicu tetap bekerja lewat event di atas.
    return <TutorialBridge onStart={start} />;
  }

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const progress = Math.round(((index + 1) / STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial POS GG Online"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl motion-safe:animate-[dialog-in_0.18s_ease-out]"
      >
        <div className="h-1.5 w-full bg-secondary">
          <div
            className="h-full bg-gg-lime transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Compass className="h-3.5 w-3.5 text-gg-teal" />
              Tutorial · Langkah {index + 1} dari {STEPS.length}
            </p>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight">{step.title}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Menu: {step.menu}
            </p>
          </div>
          <button
            onClick={stop}
            aria-label="Lewati tutorial"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[45vh] overflow-y-auto scroll-thin px-5 pb-2">
          <ol className="space-y-2">
            {step.actions.map((action, actionIndex) => (
              <li key={action} className="flex items-start gap-2.5 text-sm">
                <span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-gg-lime">
                  {actionIndex + 1}
                </span>
                <span className="text-foreground/85">{action}</span>
              </li>
            ))}
          </ol>
          {step.tip ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-gg-lime/10 p-3 text-xs text-foreground/80">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gg-teal" />
              <span>
                <span className="font-semibold">Tips: </span>
                {step.tip}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
          <Button variant="ghost" size="sm" onClick={stop}>
            Lewati tutorial
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Sebelumnya
            </Button>
            {isLast ? (
              <Button variant="accent" size="sm" onClick={stop}>
                <Check className="h-3.5 w-3.5" /> Selesai
              </Button>
            ) : (
              <Button variant="accent" size="sm" onClick={() => setIndex((i) => i + 1)}>
                Berikutnya <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Menjaga konteks tetap terpasang walau overlay tidak tampil. */
function TutorialBridge({ onStart }: { onStart: () => void }) {
  React.useEffect(() => {
    const handler = () => onStart();
    window.addEventListener(START_EVENT, handler);
    return () => window.removeEventListener(START_EVENT, handler);
  }, [onStart]);
  return null;
}

/** Tombol pemutar ulang tutorial, untuk sidebar atau pengaturan. */
export function TutorialLauncher({ className }: { className?: string }) {
  const { start } = useTutorial();
  return (
    <Button variant="subtle" size="sm" className={className} onClick={start}>
      <PlayCircle className="h-3.5 w-3.5" /> Mulai tutorial
    </Button>
  );
}

/** Ajakan tutorial untuk dashboard workspace yang masih kosong. */
export function TutorialInvite() {
  const { start } = useTutorial();
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gg-lime/40 bg-gg-lime/10 p-4">
      <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-gg-teal" />
      <div className="text-sm">
        <p className="font-bold">Database Anda masih kosong</p>
        <p className="mt-0.5 text-muted-foreground">
          Ikuti tutorial untuk mengisi barang dan pelanggan, lalu mulai transaksi kasir.
        </p>
        <Button variant="accent" size="sm" className="mt-2" onClick={start}>
          Mulai tutorial
        </Button>
      </div>
    </div>
  );
}

export const TUTORIAL_STEP_COUNT = STEPS.length;