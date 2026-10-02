import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  ScrollText,
  Settings,
  ShoppingCart,
  Sparkles,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ to: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    label: "Ringkasan",
    items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Transaksi",
    items: [
      { to: "/app/pos", label: "Kasir POS", icon: ShoppingCart },
      { to: "/app/penjualan", label: "Penjualan", icon: Receipt },
      { to: "/app/pembelian", label: "Pembelian", icon: Truck },
      { to: "/app/persediaan", label: "Persediaan", icon: Boxes },
      { to: "/app/aset-tetap", label: "Aset Tetap", icon: Building2 },
    ],
  },
  {
    label: "Akuntansi",
    items: [
      { to: "/app/buku-besar", label: "Buku Besar", icon: ScrollText },
      { to: "/app/kas-bank", label: "Kas & Bank", icon: Wallet },
      { to: "/app/laporan", label: "Laporan", icon: BarChart3 },
    ],
  },
  {
    label: "Data & Sistem",
    items: [
      { to: "/app/master-data", label: "Master Data", icon: Package },
      { to: "/app/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
];

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/app" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gg-lime text-sm font-black text-navy-950">
        GG
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">POS GG Online</span>
          <span className="block text-[11px] text-white/50">Kasir &amp; Akuntansi</span>
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto scroll-thin bg-navy-900 p-4">
      <div className="flex items-center justify-between">
        <Brand />
        {onNavigate ? (
          <button
            onClick={onNavigate}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/35">
              {group.label}
            </span>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-white shadow-inner"
                      : "text-white/60 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn("h-4 w-4", isActive ? "text-gg-lime" : "text-white/50")}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="rounded-xl bg-gradient-to-br from-gg-teal/20 to-gg-lime/10 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5 text-gg-lime" /> Blueprint Accurate-style
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-white/60">
          Order-to-Cash, Procure-to-Pay, persediaan, dan double-entry dalam satu ledger.
        </p>
      </div>
    </div>
  );
}

export function AppShell() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const me = useQuery(api.company.me);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <SidebarContent />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-border p-2 text-muted-foreground lg:hidden"
                aria-label="Buka menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold">
                    {me?.company?.name ??
                      (me === undefined ? "Memuat perusahaan…" : "Menyiapkan workspace…")}
                  </span>
                  <Badge variant="lime" className="hidden sm:inline-flex">
                    Aktif
                  </Badge>
                </div>
                <span className="block truncate text-xs text-muted-foreground">
                  {me?.company?.taxId ? `NPWP ${me.company.taxId}` : "Periode fiskal 2026 • IDR"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="accent"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => navigate("/app/pos")}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> Buka Kasir
              </Button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-sm hover:bg-secondary"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-800 text-xs font-bold text-white">
                    {(me?.userName ?? "G").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:block">
                    {me?.userName ?? "Pengguna"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold">{me?.userName}</p>
                      <p className="truncate text-xs text-muted-foreground">{me?.email}</p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    <button
                      onClick={() => navigate("/app/pengaturan")}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                    >
                      <Settings className="h-4 w-4" /> Pengaturan
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" /> Keluar
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" /> POS GG Online — double-entry accounting engine
            </span>
            <span>Setiap transaksi otomatis membentuk jurnal, stok, dan laporan.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
