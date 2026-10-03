import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
} from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/convex/_generated/api";
import { Badge, StatusChip } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Loading, PageHeader, Stat } from "@/components/ui/misc";
import { TutorialInvite } from "@/components/tutorial";
import { Button } from "@/components/ui/button";
import {
  currentMonthISO,
  formatIDR,
  monthEndISO,
  monthLabel,
  monthStartISO,
} from "@/lib/utils";

export default function Dashboard() {
  const month = currentMonthISO();
  const dashboard = useQuery(api.reports.dashboard, { month });
  const profitLoss = useQuery(api.reports.profitLoss, {
    from: monthStartISO(month),
    to: monthEndISO(month),
  });
  const ensureCompany = useMutation(api.company.ensureCompany);
  const [setupError, setSetupError] = React.useState<string | null>(null);

  const setupWorkspace = async () => {
    try {
      await ensureCompany({});
      setSetupError(null);
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : String(err));
    }
  };

  if (dashboard === undefined || profitLoss === undefined) {
    return <Loading label="Menyiapkan dashboard…" />;
  }
  if (!dashboard) {
    return (
      <EmptyState
        title="Workspace belum siap"
        description={
          setupError
            ? `Inisialisasi gagal: ${setupError}`
            : "Data perusahaan belum dibuat. Jalankan inisialisasi workspace untuk mengisi COA, master data, dan saldo awal."
        }
        action={
          <Button variant="accent" onClick={() => void setupWorkspace()}>
            Siapkan workspace
          </Button>
        }
      />
    );
  }

  const aging = dashboard.recentInvoices
    .filter((inv: any) => inv.status === "posted")
    .map((inv: any) => {
      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
      const days = Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000));
      return { ...inv, days };
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Ringkasan performa bisnis — ${monthLabel(month)}`}
        actions={
          <>
            <Link to="/app/pos">
              <Button variant="accent" size="sm">
                <ShoppingCart className="h-3.5 w-3.5" /> Transaksi Kasir
              </Button>
            </Link>
            <Link to="/app/penjualan">
              <Button variant="outline" size="sm">
                <Receipt className="h-3.5 w-3.5" /> Faktur Baru
              </Button>
            </Link>
          </>
        }
      />

      {/* ONBOARDING — hanya muncul selagi workspace masih kosong */}
      {dashboard.counts.items === 0 && dashboard.counts.invoices === 0 ? (
        <TutorialInvite />
      ) : null}

      {/* KPI ROW */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Penjualan Bulan Ini"
          value={formatIDR(dashboard.monthSales, { compact: true })}
          hint={`${dashboard.counts.openInvoices} faktur belum lunas`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <Stat
          label="Laba / Rugi Bulan Ini"
          value={formatIDR(dashboard.profit, { compact: true })}
          hint={`Pendapatan ${formatIDR(dashboard.revenue, { compact: true })} • Beban ${formatIDR(
            dashboard.expense,
            { compact: true },
          )}`}
          tone={dashboard.profit >= 0 ? "positive" : "negative"}
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <Stat
          label="Saldo Kas & Bank"
          value={formatIDR(dashboard.cashTotal, { compact: true })}
          hint={`${dashboard.cashBreakdown.length} rekening aktif`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <Stat
          label="Nilai Persediaan"
          value={formatIDR(dashboard.inventoryValue, { compact: true })}
          hint={`${dashboard.counts.items} SKU terdaftar`}
          icon={<Boxes className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* SALES / PURCHASE CHART */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Penjualan vs Pembelian (6 bulan)</CardTitle>
            <Badge variant="outline">Rp</Badge>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(value: number) => formatIDR(value, { compact: true }).replace("Rp ", "")}
                  width={62}
                />
                <Tooltip
                  formatter={(value: number | string) => formatIDR(Number(value))}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="penjualan"
                  name="Penjualan"
                  stroke="#16c79a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="pembelian"
                  name="Pembelian"
                  stroke="#345dae"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CASH BREAKDOWN */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Kas &amp; Bank</CardTitle>
            <Link to="/app/kas-bank" className="text-xs font-semibold text-primary hover:underline">
              Kelola →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.cashBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada rekening.</p>
            ) : (
              dashboard.cashBreakdown.map((account: any) => (
                <div key={account._id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        "grid h-8 w-8 place-items-center rounded-lg " +
                        (account.kind === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700")
                      }
                    >
                      {account.kind === "cash" ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{account.name}</p>
                      <p className="num text-[11px] text-muted-foreground">{account.code}</p>
                    </div>
                  </div>
                  <span className="num text-sm font-bold">{formatIDR(account.balance)}</span>
                </div>
              ))
            )}
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="num text-lg font-bold">{formatIDR(dashboard.cashTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* AR AGING */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Umur Piutang</CardTitle>
            <Link to="/app/penjualan" className="text-xs font-semibold text-primary hover:underline">
              Detail →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {aging.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada piutang outstanding. 🎉</p>
            ) : (
              aging.map((inv: any) => (
                <div key={inv._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="num truncate text-xs font-semibold">{inv.number}</p>
                    <p className="truncate text-xs text-muted-foreground">{inv.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-bold">{formatIDR(inv.total - inv.paid)}</p>
                    <Badge variant={inv.days > 30 ? "danger" : inv.days > 14 ? "warning" : "outline"}>
                      {inv.days} hari
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Total Piutang
              </span>
              <span className="num font-bold">{formatIDR(dashboard.arOutstanding)}</span>
            </div>
          </CardContent>
        </Card>

        {/* LOW STOCK */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Stok Menipis</CardTitle>
            <Link to="/app/persediaan" className="text-xs font-semibold text-primary hover:underline">
              Detail →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Semua stok aman di atas minimum.</p>
            ) : (
              dashboard.lowStock.map((item: any) => (
                <div key={item._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="num text-[11px] text-muted-foreground">{item.sku}</p>
                  </div>
                  <Badge variant={item.qty <= 0 ? "danger" : "warning"}>
                    <AlertTriangle className="h-3 w-3" /> {item.qty} / {item.minStock} {item.unit}
                  </Badge>
                </div>
              ))
            )}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Utang Pemasok
              </span>
              <span className="num font-bold">{formatIDR(dashboard.apOutstanding)}</span>
            </div>
          </CardContent>
        </Card>

        {/* MONTHLY P&L SNAPSHOT */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Laba Rugi Bulan Ini</CardTitle>
            <Link to="/app/laporan" className="text-xs font-semibold text-primary hover:underline">
              Laporan →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pendapatan</span>
              <span className="num font-semibold">{formatIDR(profitLoss?.totalRevenue ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Beban / HPP</span>
              <span className="num font-semibold">{formatIDR(profitLoss?.totalExpense ?? 0)}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-navy-950 px-3 py-2.5 text-white">
              <span className="text-xs font-semibold uppercase tracking-wide">Laba Bersih</span>
              <span className="num font-bold text-gg-lime">
                {formatIDR(profitLoss?.netIncome ?? 0)}
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              {(profitLoss?.expenses ?? []).slice(0, 4).map((row: any) => (
                <div key={row._id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.name}</span>
                  <span className="num">{formatIDR(row.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RECENT INVOICES */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Faktur Terbaru</CardTitle>
          <Link to="/app/penjualan" className="text-xs font-semibold text-primary hover:underline">
            Semua faktur →
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada transaksi. Mulai dari kasir POS.</p>
          ) : (
            dashboard.recentInvoices.map((inv: any) => (
              <div
                key={inv._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  {inv.isPos ? (
                    <ShoppingCart className="h-4 w-4 text-gg-teal" />
                  ) : (
                    <Truck className="h-4 w-4 text-navy-600" />
                  )}
                  <div>
                    <p className="num text-sm font-bold">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.customerName} • {inv.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-sm font-bold">{formatIDR(inv.total)}</span>
                  <StatusChip status={inv.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
