import {
  Award,
  Banknote,
  Boxes,
  ClipboardCheck,
  FileSignature,
  Globe,
  HandCoins,
  Percent,
  Receipt,
  Repeat,
  ShieldCheck,
  Store,
  Tag,
  Target,
  Truck,
  Undo2,
  Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Menu Penjualan: tiga kelompok dokumen — transaksi inti,
 * master data pendukung, dan dokumen khusus.
 *
 * Item yang sudah punya alur di aplikasi ini langsung diklik; sisanya ditandai
 * "Segera" dan diarahkan ke tahap roadmap masing-masing.
 */

type Tone = "trx" | "master" | "special";

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  /** Alur yang sudah tersedia di aplikasi ini. */
  action?: "invoice" | "receipt" | "return" | "customer";
  /** Tahapan roadmap ketika feature-nya belum ada. */
  roadmap?: string;
}

const ITEMS: MenuItem[] = [
  // Transaksi inti
  { label: "Penawaran Penjualan", icon: FileSignature, tone: "trx", roadmap: "V2" },
  { label: "Pesanan Penjualan", icon: ClipboardCheck, tone: "trx", roadmap: "V2" },
  { label: "Pengiriman Pesanan", icon: Truck, tone: "trx", roadmap: "V2" },
  { label: "Uang Muka Penjualan", icon: HandCoins, tone: "trx", roadmap: "V2" },
  { label: "Faktur Penjualan", icon: Receipt, tone: "trx", action: "invoice" },
  { label: "Penerimaan Penjualan", icon: Banknote, tone: "trx", action: "receipt" },
  { label: "Retur Penjualan", icon: Undo2, tone: "trx", action: "return" },
  { label: "Tukar Faktur", icon: Repeat, tone: "trx", roadmap: "V2" },
  { label: "Klaim Pelanggan", icon: ShieldCheck, tone: "trx", roadmap: "V2" },
  { label: "Peng evidenced Barang", icon: Boxes, tone: "trx", roadmap: "V2" },

  // Master data pendukung
  { label: "Kategori Pelanggan", icon: Users, tone: "master", roadmap: "V2" },
  { label: "Kategori Penjualan", icon: Tag, tone: "master", roadmap: "V2" },
  { label: "Pelanggan", icon: Store, tone: "master", action: "customer" },

  // Dokumen khusus
  { label: "Penyesuaian Harga/Diskon", icon: Percent, tone: "special", roadmap: "V2" },
  { label: "Komisi Penjualan", icon: Award, tone: "special", roadmap: "V2" },
  { label: "Target Penjualan", icon: Target, tone: "special", roadmap: "V2" },
  { label: "SmartLink e-Commerce", icon: Globe, tone: "special", roadmap: "V3" },
];

const GROUPS: Array<{ tone: Tone; title: string; hint: string }> = [
  {
    tone: "trx",
    title: "Transaksi Penjualan",
    hint: "Order-to-cash: dari penawaran sampai penerimaan kas",
  },
  { tone: "master", title: "Data Pendukung", hint: "Master data yang dipakai dokumen penjualan" },
  { tone: "special", title: "Dokumen Khusus", hint: "Fitur lanjutan sesuai skala bisnis" },
];

const TONE_STYLES: Record<Tone, { card: string; icon: string; ring: string; dot: string }> = {
  trx: {
    card: "border-emerald-500/30 bg-emerald-500/[0.04] hover:border-emerald-500/60 hover:bg-emerald-500/[0.08]",
    icon: "bg-emerald-500/10 text-emerald-600",
    ring: "bg-emerald-500",
    dot: "text-emerald-600",
  },
  master: {
    card: "border-sky-500/30 bg-sky-500/[0.04] hover:border-sky-500/60 hover:bg-sky-500/[0.08]",
    icon: "bg-sky-500/10 text-sky-600",
    ring: "bg-sky-500",
    dot: "text-sky-600",
  },
  special: {
    card: "border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/60 hover:bg-amber-500/[0.08]",
    icon: "bg-amber-500/10 text-amber-600",
    ring: "bg-amber-500",
    dot: "text-amber-600",
  },
};

interface Props {
  onNewInvoice: () => void;
  onShowReceipts: () => void;
  onShowReturns: () => void;
  onOpenCustomers: () => void;
}

export function SalesMenu({
  onNewInvoice,
  onShowReceipts,
  onShowReturns,
  onOpenCustomers,
}: Props) {
  const handle = (item: MenuItem) => {
    switch (item.action) {
      case "invoice":
        onNewInvoice();
        return;
      case "receipt":
        onShowReceipts();
        return;
      case "return":
        onShowReturns();
        return;
      case "customer":
        onOpenCustomers();
        return;
      default:
        toast.info(`${item.label} belum tersedia`, {
          description: `Fitur ini masuk roadmap ${item.roadmap ?? "berikutnya"} — sementara pakai alur yang sudah ada.`,
        });
    }
  };

  return (
    <div className="space-y-3">
      {GROUPS.map((group) => {
        const items = ITEMS.filter((item) => item.tone === group.tone);
        const styles = TONE_STYLES[group.tone];
        return (
          <section key={group.tone} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <span className={cn("h-2.5 w-2.5 rounded-full", styles.ring)} />
                {group.title}
              </h2>
              <span className="text-xs text-muted-foreground">{group.hint}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {items.map((item) => {
                const available = Boolean(item.action);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handle(item)}
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
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-semibold leading-tight text-foreground">
                      {item.label}
                    </span>
                    {available ? (
                      <Badge variant="success" className="text-[10px]">
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Segera · {item.roadmap}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default SalesMenu;