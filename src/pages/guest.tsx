import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Building2,
  Database,
  Eraser,
  LayoutDashboard,
  Lock,
  Receipt,
  ScrollText,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AssetsView,
  CashView,
  DashboardView,
  InventoryView,
  LedgerView,
  MastersView,
  PosView,
  PurchasesView,
  ReportsView,
  SalesView,
} from "@/components/guest/views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatIDR, todayISO } from "@/lib/utils";
import {
  buildLedger,
  demoItemById,
  stockAfterGuestSales,
  type DemoSale,
} from "@/lib/demo-data";

/**
 * Mode Demo Tamu — seluruh program bisa dicoba tanpa login.
 *
 * Batasnya 10 transaksi kasir per browser (disimpan di localStorage). Setelah kuota
 * habis, transaksi baru hanya bisa dilakukan setelah masuk/daftar. Data contoh modul
 * lain tetap bisa dibaca sewaktu-waktu.
 */

const MAX_GUEST_TRANSACTIONS = 10;
const STORAGE_KEY = "posgg:guest-sales:v1";

type ModuleKey =
  | "dashboard"
  | "pos"
  | "penjualan"
  | "pembelian"
  | "persediaan"
  | "aset"
  | "buku-besar"
  | "kas-bank"
  | "laporan"
  | "master";

const MODULES: Array<{ key: ModuleKey; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Ringkasan penjualan, laba, piutang, dan kas." },
  { key: "pos", label: "Kasir POS", icon: ShoppingCart, desc: "Transaksi kasir cepat — terbatas 10 transaksi untuk tamu." },
  { key: "penjualan", label: "Penjualan", icon: Receipt, desc: "Faktur pelanggan, penerimaan, dan status lunas." },
  { key: "pembelian", label: "Pembelian", icon: Truck, desc: "Faktur pemasok, utang, dan pembayaran." },
  { key: "persediaan", label: "Persediaan", icon: Boxes, desc: "Kartu stok per gudang dan nilai persediaan." },
  { key: "aset", label: "Aset Tetap", icon: Building2, desc: "Register aset, penyusutan, dan nilai buku." },
  { key: "buku-besar", label: "Buku Besar", icon: ScrollText, desc: "Trial balance dan baris jurnal double-entry." },
  { key: "kas-bank", label: "Kas & Bank", icon: Wallet, desc: "Saldo kas, bank, dan mutasinya." },
  { key: "laporan", label: "Laporan", icon: BarChart3, desc: "Laba rugi, umur piutang/utang, dan PPN." },
  { key: "master", label: "Master Data", icon: Database, desc: "Barang, pelanggan, pemasok, dan gudang." },
];

function loadGuestSales(): DemoSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DemoSale[]) : [];
  } catch {
    return [];
  }
}

export default function Guest() {
  const [active, setActive] = React.useState<ModuleKey>("dashboard");
  const [guestSales, setGuestSales] = React.useState<DemoSale[]>(() => loadGuestSales());

  const used = guestSales.length;
  const remaining = Math.max(MAX_GUEST_TRANSACTIONS - used, 0);
  const locked = remaining === 0;

  const ledger = React.useMemo(() => buildLedger(guestSales), [guestSales]);
  const stock = React.useMemo(() => stockAfterGuestSales(guestSales), [guestSales]);

  const save = (list: DemoSale[]) => {
    setGuestSales(list);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      toast.error("Penyimpanan browser tidak tersedia, transaksi demo tidak tersimpan");
    }
  };

  const handleCheckout = (lines: Array<{ itemId: string; qty: number }>, paidAmount: number) => {
    if (guestSales.length >= MAX_GUEST_TRANSACTIONS) {
      toast.error("Kuota transaksi demo habis — masuk atau daftar untuk melanjutkan");
      return;
    }
    const computedLines = lines.map((line) => {
      const item = demoItemById.get(line.itemId);
      return {
        itemId: line.itemId,
        qty: line.qty,
        price: item?.price ?? 0,
        discount: 0,
      };
    });
    const total = computedLines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const change = paidAmount - total;
    const sale: DemoSale = {
      id: `GS-${Date.now()}`,
      number: `POS-DEMO-${String(guestSales.length + 1).padStart(2, "0")}`,
      date: todayISO(),
      customerName: "Pelanggan Umum",
      lines: computedLines,
      paid: total,
      method: "cash",
      isPos: true,
    };
    save([...guestSales, sale]);
    toast.success(
      `${sale.number} tersimpan • ${formatIDR(total)}${change > 0 ? ` • kembalian ${formatIDR(change)}` : ""} • sisa kuota ${MAX_GUEST_TRANSACTIONS - guestSales.length - 1}`,
    );
  };

  const resetDemo = () => {
    save([]);
    toast.success("Transaksi demo dihapus — kuota 10 transaksi tersedia lagi");
  };

  const current = MODULES.find((module) => module.key === active) ?? MODULES[0];

  const viewProps = { ledger, guestSales, stock };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-950 text-white">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gg-lime font-black text-navy-950">
                GG
              </span>
              <span className="hidden text-base font-bold tracking-tight sm:inline">POS GG Online</span>
            </Link>
            <Badge variant="lime">Mode Demo</Badge>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "num hidden rounded-lg px-2.5 py-1 text-xs font-bold sm:inline-block",
                locked ? "bg-rose-500/20 text-rose-200" : "bg-white/10 text-white/80",
              )}
            >
              {used}/{MAX_GUEST_TRANSACTIONS} transaksi
            </span>
            <Link to="/auth?mode=signIn">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10 hover:text-white"
              >
                Masuk
              </Button>
            </Link>
            <Link to="/auth?mode=signUp">
              <Button variant="accent" size="sm">
                Daftar
              </Button>
            </Link>
          </div>
        </div>

        {/* NAV MOBILE */}
        <nav className="scroll-thin flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 lg:hidden">
          {MODULES.map((module) => (
            <button
              key={module.key}
              type="button"
              onClick={() => setActive(module.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                active === module.key ? "bg-gg-lime text-navy-950" : "text-white/60 hover:bg-white/10",
              )}
            >
              <module.icon className="h-3.5 w-3.5" />
              {module.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex">
        {/* SIDEBAR */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col justify-between border-r border-border bg-card p-3 lg:flex">
          <nav className="space-y-0.5">
            {MODULES.map((module) => (
              <button
                key={module.key}
                type="button"
                onClick={() => setActive(module.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active === module.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <module.icon className="h-4 w-4 shrink-0" />
                {module.label}
              </button>
            ))}
          </nav>

          <div className="rounded-xl border border-border bg-secondary/60 p-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Kuota demo</span>
              <span className={cn("num", locked ? "text-rose-600" : "text-foreground")}>
                {used}/{MAX_GUEST_TRANSACTIONS}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className={cn("h-full rounded-full transition-all", locked ? "bg-rose-500" : "bg-gg-lime")}
                style={{ width: `${Math.min((used / MAX_GUEST_TRANSACTIONS) * 100, 100)}%` }}
              />
            </div>
            {used > 0 ? (
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={resetDemo}>
                <Eraser className="h-3.5 w-3.5" /> Reset demo
              </Button>
            ) : null}
          </div>
        </aside>

        {/* KONTEN */}
        <main className="min-w-0 flex-1 space-y-4 p-4 lg:p-6">
          {/* BANNER KUOTA */}
          {locked ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-rose-400/30 dark:bg-rose-500/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <p className="text-sm font-bold">
                    Kuota {MAX_GUEST_TRANSACTIONS} transaksi demo sudah habis
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Untuk transaksi berikutnya, masuk atau daftar akun — kasir, stok, dan laporan
                    penuh tanpa batas.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link to="/auth?mode=signIn">
                  <Button variant="outline" size="sm">
                    Masuk
                  </Button>
                </Link>
                <Link to="/auth?mode=signUp">
                  <Button variant="accent" size="sm">
                    Daftar Gratis
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-gg-lime/50 bg-gg-lime/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gg-teal" />
                <div>
                  <p className="text-sm font-bold">
                    Mode Demo — {used} dari {MAX_GUEST_TRANSACTIONS} transaksi terpakai
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Jelajahi semua menu program ini. Data contoh tersimpan di browser dan tidak
                    memengaruhi akun bisnis mana pun.
                  </p>
                </div>
              </div>
              <div className="w-full shrink-0 sm:w-48">
                <div className="h-1.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-gg-lime transition-all"
                    style={{ width: `${(used / MAX_GUEST_TRANSACTIONS) * 100}%` }}
                  />
                </div>
                <p className="num mt-1 text-right text-[11px] text-muted-foreground">
                  {remaining} transaksi tersisa
                </p>
              </div>
            </div>
          )}

          {/* JUDUL MODUL */}
          <div>
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{current.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{current.desc}</p>
          </div>

          {/* TAMPILAN MODUL */}
          {active === "dashboard" ? <DashboardView {...viewProps} /> : null}
          {active === "pos" ? (
            <PosView {...viewProps} locked={locked} onCheckout={handleCheckout} />
          ) : null}
          {active === "penjualan" ? <SalesView {...viewProps} /> : null}
          {active === "pembelian" ? <PurchasesView {...viewProps} /> : null}
          {active === "persediaan" ? <InventoryView {...viewProps} /> : null}
          {active === "aset" ? <AssetsView {...viewProps} /> : null}
          {active === "buku-besar" ? <LedgerView {...viewProps} /> : null}
          {active === "kas-bank" ? <CashView {...viewProps} /> : null}
          {active === "laporan" ? <ReportsView {...viewProps} /> : null}
          {active === "master" ? <MastersView {...viewProps} /> : null}
        </main>
      </div>
    </div>
  );
}