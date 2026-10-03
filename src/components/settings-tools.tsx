import { Printer, Settings2, ShieldCheck, Store, UserCog, UsersRound } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/**
 * Menu kotak ala ERP di atas halaman Pengaturan.
 *
 * Grup pertama "Alat": empat ikon sudah punya panel sendiri, sedangkan
 * "Add On" adalah katalog integrasi pihak ketiga yang belum ada.
 * Grup kedua diisi halaman Pengaturan lainnya (perusahaan, COA, audit, dst)
 * sehingga seluruh navigasi/settings tinggal dalam satu grid.
 */

export type ToolId = "preferensi" | "pengguna" | "akses-grup" | "desain-cetakan" | "add-on";

export interface SettingsTile {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  count?: number;
  /** `false` → klik hanya menampilkan toast (fitur belum tersedia). */
  ready?: boolean;
}

const TOOLS: SettingsTile[] = [
  {
    id: "preferensi",
    label: "Preferensi",
    icon: Settings2,
    hint: "Tahun buku, format tanggal, PPN default",
  },
  {
    id: "akses-grup",
    label: "Akses Grup",
    icon: UserCog,
    hint: "Peran: pemilik, manajer, kasir, pembukuan",
  },
  {
    id: "pengguna",
    label: "Pengguna",
    icon: UsersRound,
    hint: "Undang dan kelola anggota tim",
  },
  {
    id: "desain-cetakan",
    label: "Desain Cetakan",
    icon: Printer,
    hint: "Ukuran struk, footer, Kop dan detail PPN",
  },
  {
    id: "add-on",
    label: "Add On",
    icon: Store,
    hint: "Katalog integrasi & add-on pihak ketiga",
    ready: false,
  },
];

function Tile({
  tile,
  active,
  onClick,
}: {
  tile: SettingsTile;
  active: boolean;
  onClick: () => void;
}) {
  const ready = tile.ready !== false;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={
        "group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all " +
        "hover:-translate-y-0.5 hover:shadow-md " +
        (active
          ? "border-primary bg-primary/[0.07] shadow-sm"
          : ready
            ? "border-border bg-background hover:border-primary/40"
            : "border-dashed border-border bg-muted/30 hover:border-amber-500/50")
      }
    >
      <span
        className={
          "grid h-10 w-10 place-items-center rounded-xl transition-transform group-hover:scale-110 " +
          (active
            ? "bg-primary text-primary-foreground"
            : ready
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground")
        }
      >
        <tile.icon className="h-5 w-5" />
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold leading-tight text-foreground">
        {tile.label}
        {tile.count !== undefined ? (
          <span className="num rounded-full bg-secondary px-1.5 text-[10px] text-muted-foreground">
            {tile.count}
          </span>
        ) : null}
      </span>
      {tile.hint ? (
        <span className="text-[10px] leading-tight text-muted-foreground">{tile.hint}</span>
      ) : null}
      {!ready ? (
        <Badge variant="warning" className="text-[10px]">
          Segera
        </Badge>
      ) : null}
    </button>
  );
}

interface Props {
  active?: string;
  onSelect: (id: string) => void;
  /** Kotak halaman Pengaturan lain (perusahaan, COA, audit, …). */
  extraTiles?: SettingsTile[];
  extraTitle?: string;
}

export function SettingsTools({
  active,
  onSelect,
  extraTiles = [],
  extraTitle = "Perusahaan & Sistem",
}: Props) {
  const handle = (tile: SettingsTile) => {
    if (tile.ready !== false) {
      onSelect(tile.id);
      return;
    }
    toast.info(`${tile.label} belum tersedia`, {
      description:
        "Katalog integrasi & add-on pihak ketiga masuk roadmap V3. Sementara ini, integrasi yang aktif ada di kotak Integrasi.",
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="mb-3 text-sm font-bold">Alat</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {TOOLS.map((tool) => (
            <Tile
              key={tool.id}
              tile={tool}
              active={tool.id === active}
              onClick={() => handle(tool)}
            />
          ))}
        </div>
      </div>

      {extraTiles.length > 0 ? (
        <div className="border-t border-border pt-4">
          <h2 className="mb-3 text-sm font-bold">{extraTitle}</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {extraTiles.map((tile) => (
              <Tile
                key={tile.id}
                tile={tile}
                active={tile.id === active}
                onClick={() => handle(tile)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-gg-teal" />
        Setiap perubahan di menu ini tercatat pada Audit Trail.
      </p>
    </div>
  );
}

export default SettingsTools;