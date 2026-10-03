import {
  ArrowLeftRight,
  Barcode,
  Boxes,
  ClipboardList,
  Factory,
  FileText,
  History,
  Layers,
  Package,
  Ruler,
  SlidersHorizontal,
  Tags,
  Truck,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Menu Persediaan: dokumen operasional, dokumen pendukung, dan referensi.
 *
 * Item yang alurnya sudah ada (kartu stok, riwayat pergerakan, stok opname)
 * langsung diklik; sisanya ditandai "Segera" sesuai tahapnya.
 */

type Tone = "aktif" | "dokumen" | "referensi";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  /** Alur yang sudah tersedia di aplikasi ini. */
  action?: "stok" | "kartu" | "opname";
  roadmap?: string;
}

const ITEMS: MenuItem[] = [
  // Sudah aktif
  { id: "kartu-stok", label: "Kartu Stok", icon: Boxes, tone: "aktif", action: "stok" },
  { id: "riwayat", label: "Riwayat Pergerakan", icon: History, tone: "aktif", action: "kartu" },
  { id: "perintah-opname", label: "Perintah Stock Opname", icon: ClipboardList, tone: "aktif", action: "opname" },
  { id: "hasil-opname", label: "Hasil Stock Opname", icon: FileText, tone: "aktif", roadmap: "V2" },

  // Dokumen persediaan
  { id: "pemindahan", label: "Pemindahan Barang", icon: ArrowLeftRight, tone: "dokumen", roadmap: "V2" },
  { id: "penyesuaian", label: "Penyesuaian Persediaan", icon: SlidersHorizontal, tone: "dokumen", roadmap: "V2" },
  { id: "pekerjaan", label: "Pekerjaan Pesanan", icon: Factory, tone: "dokumen", roadmap: "V3" },
  { id: "bahan-baku", label: "Pemindahan Bahan Baku", icon: Truck, tone: "dokumen", roadmap: "V2" },
  { id: "penyesuaian-pesanan", label: "Penyesuaian Pesanan", icon: Layers, tone: "dokumen", roadmap: "V2" },
  { id: "nomor-seri", label: "Pengisian Nomor Seri", icon: Barcode, tone: "dokumen", roadmap: "V2" },

  // Referensi
  { id: "referensi", label: "Referensi Barang", icon: Package, tone: "referensi", roadmap: "V2" },
  { id: "kategori", label: "Kategori Barang", icon: Tags, tone: "referensi", roadmap: "V2" },
  { id: "satuan", label: "Satuan", icon: Ruler, tone: "referensi", roadmap: "V2" },
];

const GROUPS: Array<{ tone: Tone; title: string; hint: string }> = [
  {
    tone: "aktif",
    title: "Aktif",
    hint: "Alur yang sudah jalan di aplikasi ini",
  },
  {
    tone: "dokumen",
    title: "Dokumen Persediaan",
    hint: "Pemindahan, penyesuaian, dan proses bahan baku",
  },
  {
    tone: "referensi",
    title: "Referensi",
    hint: "Master data pendukung klasifikasi barang",
  },
];

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

interface Props {
  /** Kotak yang sedang aktif (kartu stok / riwayat). */
  active?: string;
  onSelect: (id: string) => void;
  onOpenOpname: () => void;
}

export function InventoryMenu({ active, onSelect, onOpenOpname }: Props) {
  const handle = (item: MenuItem) => {
    switch (item.action) {
      case "stok":
        onSelect("kartu-stok");
        return;
      case "kartu":
        onSelect("riwayat");
        return;
      case "opname":
        onOpenOpname();
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
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => {
                const available = Boolean(item.action);
                const isActive = item.id === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handle(item)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      isActive && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-card",
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

export default InventoryMenu;