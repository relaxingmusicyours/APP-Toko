import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Landmark,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState, Stat } from "@/components/ui/misc";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn, formatDate, formatIDR, formatNumber } from "@/lib/utils";
import {
  DEMO_ASSETS,
  DEMO_CUSTOMERS,
  DEMO_ITEMS,
  DEMO_SUPPLIERS,
  DEMO_WAREHOUSES,
  type DemoLedger,
  type DemoSale,
  accumulatedFor,
  billTotals,
  demoItemById,
  saleTotals,
} from "@/lib/demo-data";

export type DemoViewProps = {
  ledger: DemoLedger;
  guestSales: DemoSale[];
  stock: Map<string, number>;
};

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-bold">{title}</p>
      </div>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export function DashboardView({ ledger }: DemoViewProps) {
  const maxMonth = Math.max(...ledger.monthlySales.map((m) => m.value), 1);
  const recent = ledger.sales.slice(-5).reverse();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Penjualan"
          value={formatIDR(ledger.totalSales, { compact: true })}
          hint={`${ledger.sales.length} transaksi`}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="lime"
        />
        <Stat
          label="Laba kotor"
          value={formatIDR(ledger.grossProfit, { compact: true })}
          hint={`Margin ${ledger.totalSales > 0 ? Math.round((ledger.grossProfit / ledger.totalSales) * 100) : 0}%`}
          icon={<ArrowUpRight className="h-4 w-4" />}
          tone="positive"
        />
        <Stat
          label="Piutang usaha"
          value={formatIDR(ledger.receivable, { compact: true })}
          hint={`${ledger.arAging.length} pelanggan`}
          icon={<Receipt className="h-4 w-4" />}
          tone={ledger.receivable > 0 ? "warning" : "default"}
        />
        <Stat
          label="Kas & bank"
          value={formatIDR(ledger.cashBalance + ledger.bankBalance, { compact: true })}
          hint={`Kas ${formatIDR(ledger.cashBalance, { compact: true })} • Bank ${formatIDR(ledger.bankBalance, { compact: true })}`}
          icon={<Landmark className="h-4 w-4" />}
          tone="default"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <SectionTitle icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} title="Penjualan per bulan" hint="data contoh" />
          <div className="flex h-48 items-end gap-2">
            {ledger.monthlySales.map((month) => (
              <div key={month.month} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="num text-[10px] font-semibold text-muted-foreground">
                  {formatIDR(month.value, { compact: true })}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-gg-lime/70 to-gg-teal/70"
                  style={{ height: `${Math.max((month.value / maxMonth) * 100, 4)}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{month.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={<Package className="h-4 w-4 text-muted-foreground" />} title="Produk terlaris" />
          <ul className="space-y-3">
            {ledger.topProducts.map((row, index) => (
              <li key={row.itemId} className="flex items-center gap-3">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary text-xs font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="num text-xs text-muted-foreground">
                    {formatNumber(row.qty)} unit • {formatIDR(row.value, { compact: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle icon={<Receipt className="h-4 w-4 text-muted-foreground" />} title="Transaksi terakhir" />
        </div>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>No</TH>
                <TH>Tanggal</TH>
                <TH>Pelanggan</TH>
                <TH>Item</TH>
                <TH>Total</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {recent.map((sale) => {
                const totals = saleTotals(sale);
                const status = sale.isPos ? "Lunas" : totals.total - sale.paid <= 0 ? "Lunas" : "Belum lunas";
                return (
                  <TR key={sale.id}>
                    <TD className="num text-xs font-semibold">{sale.number}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(sale.date)}
                    </TD>
                    <TD className="text-sm">{sale.customerName}</TD>
                    <TD className="num text-xs text-muted-foreground">{totals.qty} item</TD>
                    <TD className="num font-semibold">{formatIDR(totals.total)}</TD>
                    <TD>
                      <Badge variant={status === "Lunas" ? "success" : "warning"}>{status}</Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kasir (POS) — interaktif, memakai kuota tamu                         */
/* ------------------------------------------------------------------ */

export function PosView({
  stock,
  guestSales,
  locked,
  onCheckout,
}: DemoViewProps & {
  locked: boolean;
  onCheckout: (lines: Array<{ itemId: string; qty: number }>, paid: number) => void;
}) {
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [paidInput, setPaidInput] = React.useState("");

  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const item = demoItemById.get(itemId);
      return item ? { item: { ...item, stock: stock.get(itemId) ?? item.stock }, qty } : null;
    })
    .filter((line): line is { item: (typeof DEMO_ITEMS)[number]; qty: number } => line !== null);

  const total = lines.reduce((sum, line) => sum + line.item.price * line.qty, 0);
  const paid = Math.max(Math.round(Number(paidInput) || 0), 0);
  const change = paid - total;
  const canCheckout = lines.length > 0 && paid >= total && !locked;

  const add = (itemId: string) =>
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));

  const changeQty = (itemId: string, delta: number) =>
    setCart((prev) => ({ ...prev, [itemId]: Math.max((prev[itemId] ?? 0) + delta, 0) }));

  const reset = () => {
    setCart({});
    setPaidInput("");
  };

  const checkout = () => {
    if (!canCheckout) return;
    onCheckout(
      lines.map((line) => ({ itemId: line.item.id, qty: line.qty })),
      paid,
    );
    reset();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <Card className="p-5">
        <SectionTitle
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          title="Pilih Produk"
          hint={`${DEMO_ITEMS.length} SKU contoh`}
        />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {DEMO_ITEMS.map((product) => {
            const available = stock.get(product.id) ?? product.stock;
            const qty = cart[product.id] ?? 0;
            const soldOut = available <= 0;
            return (
              <button
                key={product.id}
                type="button"
                disabled={soldOut}
                onClick={() => add(product.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
                  qty > 0 ? "border-gg-lime bg-gg-lime/10" : "border-border bg-card hover:border-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight">{product.name}</p>
                  {qty > 0 ? <Badge variant="lime">{qty}</Badge> : null}
                </div>
                <p className="num mt-1.5 text-xs text-muted-foreground">
                  {product.sku} • stok {available}
                </p>
                <p className="num mt-1 text-sm font-bold text-primary">
                  {formatIDR(product.price)}
                  <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                    / {product.unit}
                  </span>
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex h-fit flex-col p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-bold">Keranjang</p>
          {lines.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              Kosongkan
            </Button>
          ) : null}
        </div>

        {lines.length === 0 ? (
          <EmptyState
            title="Keranjang masih kosong"
            description="Klik produk untuk menambahkan."
            icon={<ShoppingCart className="h-8 w-8" />}
          />
        ) : (
          <ul className="space-y-3">
            {lines.map(({ item, qty }) => (
              <li key={item.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="num text-xs text-muted-foreground">
                    {formatIDR(item.price)} × {qty}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="subtle" size="icon" onClick={() => changeQty(item.id, -1)} aria-label={`Kurangi ${item.name}`}>
                    −
                  </Button>
                  <span className="num w-6 text-center text-sm font-semibold">{qty}</span>
                  <Button
                    variant="subtle"
                    size="icon"
                    onClick={() => changeQty(item.id, 1)}
                    disabled={qty >= item.stock}
                    aria-label={`Tambah ${item.name}`}
                  >
                    +
                  </Button>
                </div>
                <p className="num w-24 text-right text-sm font-bold">
                  {formatIDR(item.price * qty)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="num text-lg font-bold">{formatIDR(total)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="subtle" size="sm" onClick={() => setPaidInput(String(total))}>
              Uang pas
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setPaidInput(String(Math.ceil(total / 50000) * 50000))}
            >
              Bulat 50rb
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setPaidInput(String(Math.ceil(total / 100000) * 100000))}
            >
              Bulat 100rb
            </Button>
          </div>
          <Input
            type="number"
            inputMode="numeric"
            value={paidInput}
            onChange={(e) => setPaidInput(e.target.value)}
            placeholder="Uang diterima (Rp)"
            aria-label="Uang diterima"
          />
          <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
            <span className="text-xs text-muted-foreground">Kembalian</span>
            <span className={cn("num text-sm font-bold", change < 0 ? "text-rose-600" : "text-emerald-600")}>
              {formatIDR(change)}
            </span>
          </div>

          {locked ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <AlertTriangle className="mx-auto h-5 w-5 text-amber-600" />
              <p className="mt-2 text-sm font-bold">Kuota transaksi habis</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Untuk transaksi berikutnya, masuk atau daftar akun Anda.
              </p>
            </div>
          ) : (
            <Button variant="accent" size="lg" className="w-full" disabled={!canCheckout} onClick={checkout}>
              <Receipt className="h-4 w-4" /> Simpan Transaksi
            </Button>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            {guestSales.length} transaksi dibuat selama sesi demo ini.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Penjualan                                                            */
/* ------------------------------------------------------------------ */

export function SalesView({ ledger }: DemoViewProps) {
  const outstanding = ledger.sales.reduce(
    (sum, sale) => sum + Math.max(saleTotals(sale).total - sale.paid, 0),
    0,
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total faktur" value={formatIDR(ledger.totalSales, { compact: true })} hint={`${ledger.sales.length} dokumen`} />
        <Stat label="Belum lunas" value={formatIDR(outstanding, { compact: true })} tone="warning" hint="piutang usaha" />
        <Stat label="POSvs Faktur" value={`${ledger.sales.filter((s) => s.isPos).length} / ${ledger.sales.filter((s) => !s.isPos).length}`} hint="kasir / faktur" />
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle icon={<Receipt className="h-4 w-4 text-muted-foreground" />} title="Faktur & transaksi kasir" />
        </div>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>No</TH>
                <TH>Tanggal</TH>
                <TH>Pelanggan</TH>
                <TH>Jatuh Tempo</TH>
                <TH>Total</TH>
                <TH>Dibayar</TH>
                <TH>Sisa</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {[...ledger.sales].reverse().map((sale) => {
                const totals = saleTotals(sale);
                const sisa = Math.max(totals.total - sale.paid, 0);
                return (
                  <TR key={sale.id}>
                    <TD className="num text-xs font-semibold">{sale.number}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(sale.date)}</TD>
                    <TD className="text-sm">{sale.customerName}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {sale.dueDate ? formatDate(sale.dueDate) : "—"}
                    </TD>
                    <TD className="num font-semibold">{formatIDR(totals.total)}</TD>
                    <TD className="num text-muted-foreground">{formatIDR(sale.paid)}</TD>
                    <TD className="num font-semibold">{formatIDR(sisa)}</TD>
                    <TD>
                      <Badge variant={sisa <= 0 ? "success" : sale.isPos ? "info" : "warning"}>
                        {sisa <= 0 ? "Lunas" : sale.isPos ? "Kasir" : "Belum lunas"}
                      </Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pembelian                                                            */
/* ------------------------------------------------------------------ */

export function PurchasesView({ ledger }: DemoViewProps) {
  const unpaid = ledger.bills.reduce(
    (sum, bill) => sum + Math.max(billTotals(bill).total - bill.paid, 0),
    0,
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total pembelian" value={formatIDR(ledger.totalPurchases, { compact: true })} hint={`${ledger.bills.length} faktur`} />
        <Stat label="Belum dibayar" value={formatIDR(unpaid, { compact: true })} tone="warning" hint="utang usaha" />
        <Stat label="Total sudah dibayar" value={formatIDR(ledger.totalPurchases - unpaid, { compact: true })} tone="positive" />
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle icon={<Building2 className="h-4 w-4 text-muted-foreground" />} title="Faktur pembelian" />
        </div>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>No</TH>
                <TH>Tanggal</TH>
                <TH>Pemasok</TH>
                <TH>Total</TH>
                <TH>Dibayar</TH>
                <TH>Sisa</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {[...ledger.bills].reverse().map((bill) => {
                const totals = billTotals(bill);
                const sisa = Math.max(totals.total - bill.paid, 0);
                return (
                  <TR key={bill.id}>
                    <TD className="num text-xs font-semibold">{bill.number}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(bill.date)}</TD>
                    <TD className="text-sm">{bill.supplierName}</TD>
                    <TD className="num font-semibold">{formatIDR(totals.total)}</TD>
                    <TD className="num text-muted-foreground">{formatIDR(bill.paid)}</TD>
                    <TD className="num font-semibold">{formatIDR(sisa)}</TD>
                    <TD>
                      <Badge variant={sisa <= 0 ? "success" : "warning"}>
                        {sisa <= 0 ? "Lunas" : "Belum bayar"}
                      </Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Persediaan                                                           */
/* ------------------------------------------------------------------ */

export function InventoryView({ stock }: DemoViewProps) {
  const rows = DEMO_ITEMS.map((item) => ({
    item,
    qty: stock.get(item.id) ?? item.stock,
    value: (stock.get(item.id) ?? item.stock) * item.cost,
  }));
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const lowStock = rows.filter((row) => row.qty <= row.item.minStock);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Nilai persediaan" value={formatIDR(totalValue, { compact: true })} hint="berdasarkan biaya rata-rata" />
        <Stat label="Jenis barang" value={formatNumber(rows.length)} hint={`${rows.reduce((s, r) => s + r.qty, 0)} unit di gudang`} />
        <Stat
          label="Stok menipis"
          value={formatNumber(lowStock.length)}
          tone={lowStock.length > 0 ? "warning" : "positive"}
          hint="di bawah stok minimum"
        />
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle
            icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
            title="Kartu stok"
            hint={`${DEMO_WAREHOUSES.length} gudang`}
          />
        </div>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>SKU</TH>
                <TH>Nama Barang</TH>
                <TH>Kategori</TH>
                <TH>Stok</TH>
                <TH>Minimum</TH>
                <TH>Harga Jual</TH>
                <TH>Harga Pokok</TH>
                <TH>Nilai</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map(({ item, qty, value }) => (
                <TR key={item.id}>
                  <TD className="num text-xs font-semibold">{item.sku}</TD>
                  <TD className="text-sm font-medium">{item.name}</TD>
                  <TD>
                    <Badge variant="outline">{item.category}</Badge>
                  </TD>
                  <TD className={cn("num font-semibold", qty <= item.minStock && "text-amber-600")}>
                    {formatNumber(qty)} {item.unit}
                  </TD>
                  <TD className="num text-muted-foreground">{formatNumber(item.minStock)}</TD>
                  <TD className="num">{formatIDR(item.price)}</TD>
                  <TD className="num text-muted-foreground">{formatIDR(item.cost)}</TD>
                  <TD className="num font-semibold">{formatIDR(value)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aset tetap                                                           */
/* ------------------------------------------------------------------ */

export function AssetsView({ ledger }: DemoViewProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Nilai perolehan" value={formatIDR(ledger.fixedAssetCost, { compact: true })} hint="aset aktif" />
        <Stat label="Akumulasi penyusutan" value={formatIDR(ledger.accumulatedDepreciation, { compact: true })} tone="warning" />
        <Stat label="Nilai buku" value={formatIDR(ledger.bookValue, { compact: true })} tone="positive" />
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle icon={<Building2 className="h-4 w-4 text-muted-foreground" />} title="Register aset tetap" />
        </div>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Kode</TH>
                <TH>Nama Aset</TH>
                <TH>Perolehan</TH>
                <TH>Nilai Perolehan</TH>
                <TH>Akumulasi</TH>
                <TH>Nilai Buku</TH>
                <TH>Metode</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {DEMO_ASSETS.map((asset) => {
                const accumulated = accumulatedFor(asset, asset.depreciatedMonths);
                const bookValue = asset.cost - accumulated;
                return (
                  <TR key={asset.code}>
                    <TD className="num text-xs font-semibold">{asset.code}</TD>
                    <TD className="text-sm font-medium">{asset.name}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(asset.acquisitionDate)}
                    </TD>
                    <TD className="num">{formatIDR(asset.cost)}</TD>
                    <TD className="num text-muted-foreground">{formatIDR(accumulated)}</TD>
                    <TD className="num font-semibold">
                      {asset.disposed ? "—" : formatIDR(bookValue)}
                    </TD>
                    <TD>
                      <Badge variant="outline">
                        {asset.method === "straight_line" ? "Garis lurus" : "Saldo menurun"}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge variant={asset.disposed ? "danger" : "success"}>
                        {asset.disposed ? "Dialihkan" : "Aktif"}
                      </Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buku besar                                                           */
/* ------------------------------------------------------------------ */

export function LedgerView({ ledger }: DemoViewProps) {
  const debits = ledger.journal.slice(0, 25);
  const totalDebit = ledger.trialBalance.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = ledger.trialBalance.reduce((sum, row) => sum + row.credit, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Total debit" value={formatIDR(totalDebit, { compact: true })} hint={`${ledger.journal.length} baris jurnal`} />
        <Stat
          label="Total kredit"
          value={formatIDR(totalCredit, { compact: true })}
          tone={totalDebit === totalCredit ? "positive" : "negative"}
          hint={totalDebit === totalCredit ? "seimbang — debit = kredit" : "tidak seimbang"}
        />
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle icon={<Landmark className="h-4 w-4 text-muted-foreground" />} title="Trial balance" />
        </div>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Kode</TH>
                <TH>Nama Akun</TH>
                <TH>Debit</TH>
                <TH>Kredit</TH>
                <TH>Saldo</TH>
              </TR>
            </THead>
            <TBody>
              {ledger.trialBalance
                .filter((row) => row.debit > 0 || row.credit > 0)
                .map((row) => (
                  <TR key={row.code}>
                    <TD className="num text-xs font-semibold">{row.code}</TD>
                    <TD className="text-sm">{row.name}</TD>
                    <TD className="num">{row.debit > 0 ? formatIDR(row.debit) : "—"}</TD>
                    <TD className="num">{row.credit > 0 ? formatIDR(row.credit) : "—"}</TD>
                    <TD className="num font-semibold">{formatIDR(Math.abs(row.balance))}</TD>
                  </TR>
                ))}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle
            icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
            title="Baris jurnal terbaru"
            hint="25 terakhir"
          />
        </div>
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Tanggal</TH>
                <TH>Sumber</TH>
                <TH>Akun</TH>
                <TH>Keterangan</TH>
                <TH>Debit</TH>
                <TH>Kredit</TH>
              </TR>
            </THead>
            <TBody>
              {debits.map((line, index) => (
                <TR key={`${line.sourceNumber}-${line.code}-${index}`}>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(line.date)}</TD>
                  <TD>
                    <Badge variant="outline">{line.sourceType}</Badge>
                  </TD>
                  <TD className="text-xs">
                    <span className="num font-semibold">{line.code}</span> {line.name}
                  </TD>
                  <TD className="max-w-[220px] truncate text-xs text-muted-foreground">{line.memo}</TD>
                  <TD className="num">{line.debit > 0 ? formatIDR(line.debit) : "—"}</TD>
                  <TD className="num">{line.credit > 0 ? formatIDR(line.credit) : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kas & bank                                                           */
/* ------------------------------------------------------------------ */

export function CashView({ ledger }: DemoViewProps) {
  const cashTxs = ledger.journal.filter((line) => line.sourceType === "CASH");
  const seen = new Set<string>();
  const rows = cashTxs
    .filter((line) => {
      if (seen.has(line.sourceNumber)) return false;
      seen.add(line.sourceNumber);
      return true;
    })
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Saldo Kas" value={formatIDR(ledger.cashBalance, { compact: true })} hint="1-1000 Kas" icon={<ArrowUpRight className="h-4 w-4" />} />
        <Stat label="Saldo Bank" value={formatIDR(ledger.bankBalance, { compact: true })} hint="1-1100 Bank" icon={<ArrowDownRight className="h-4 w-4" />} />
      </div>
      <Card>
        <div className="border-b border-border p-4">
          <SectionTitle icon={<Landmark className="h-4 w-4 text-muted-foreground" />} title="Mutasi kas & bank" />
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Belum ada mutasi kas.</p>
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>No</TH>
                  <TH>Tanggal</TH>
                  <TH>Keterangan</TH>
                  <TH>Akun</TH>
                  <TH>Debit</TH>
                  <TH>Kredit</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((line) => (
                  <TR key={line.sourceNumber}>
                    <TD className="num text-xs font-semibold">{line.sourceNumber}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(line.date)}</TD>
                    <TD className="text-sm">{line.memo.split("—")[1]?.trim() ?? line.memo}</TD>
                    <TD className="text-xs">{line.name}</TD>
                    <TD className="num font-semibold text-emerald-600">
                      {line.debit > 0 ? formatIDR(line.debit) : "—"}
                    </TD>
                    <TD className="num font-semibold text-rose-600">
                      {line.credit > 0 ? formatIDR(line.credit) : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Laporan                                                              */
/* ------------------------------------------------------------------ */

export function ReportsView({ ledger }: DemoViewProps) {
  const margin = ledger.totalSales > 0 ? Math.round((ledger.grossProfit / ledger.totalSales) * 100) : 0;
  const netMargin = ledger.totalSales > 0 ? Math.round((ledger.netProfit / ledger.totalSales) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total pendapatan" value={formatIDR(ledger.totalRevenue, { compact: true })} tone="positive" />
        <Stat label="Laba kotor" value={formatIDR(ledger.grossProfit, { compact: true })} hint={`margin ${margin}%`} tone="lime" />
        <Stat label="Beban operasional" value={formatIDR(ledger.totalOpex, { compact: true })} tone="warning" />
        <Stat label="Laba bersih" value={formatIDR(ledger.netProfit, { compact: true })} hint={`margin ${netMargin}%`} tone={ledger.netProfit >= 0 ? "positive" : "negative"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} title="Laporan laba rugi" />
          <table className="w-full text-sm">
            <tbody>
              <Row label="Pendapatan penjualan" value={ledger.salesRevenue} />
              <Row label="Pendapatan lain" value={ledger.otherIncome} />
              <Row label="Total pendapatan" value={ledger.totalRevenue} bold />
              <Row label="Harga pokok penjualan" value={-ledger.totalCogs} />
              <Row label="Laba kotor" value={ledger.grossProfit} bold />
              <Row label="Beban operasional" value={-ledger.totalOpex} />
              <Row label="Laba bersih" value={ledger.netProfit} bold tone={ledger.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"} />
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={<Receipt className="h-4 w-4 text-muted-foreground" />} title="Ringkasan PPN" />
          <table className="w-full text-sm">
            <tbody>
              <Row label="PPN keluaran (penjualan)" value={ledger.taxOutput} />
              <Row label="PPN masukan (pembelian)" value={-ledger.taxInput} />
              <Row
                label={ledger.taxPayable >= 0 ? "PPN yang harus dibayar" : "PPN lebih bayar (kredit pajak)"}
                value={Math.abs(ledger.taxPayable)}
                bold
                tone={ledger.taxPayable >= 0 ? "text-amber-600" : "text-emerald-600"}
              />
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Angka turunan dari jurnal demo — sama dengan yang muncul di akun PPN Keluaran (2-1100).
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-border p-4">
            <SectionTitle icon={<Receipt className="h-4 w-4 text-muted-foreground" />} title="Umur piutang usaha (AR)" hint={`${formatIDR(ledger.receivable, { compact: true })}`} />
          </div>
          {ledger.arAging.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Tidak ada piutang jatuh tempo.</p>
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Pelanggan</TH>
                    <TH>0–14</TH>
                    <TH>15–30</TH>
                    <TH>&gt;30</TH>
                    <TH>Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {ledger.arAging.map((row) => (
                    <TR key={row.party}>
                      <TD className="text-sm">{row.party}</TD>
                      <TD className="num text-xs">{row.d0_14 ? formatIDR(row.d0_14) : "—"}</TD>
                      <TD className="num text-xs">{row.d15_30 ? formatIDR(row.d15_30) : "—"}</TD>
                      <TD className={cn("num text-xs font-semibold", row.d30plus > 0 && "text-rose-600")}>
                        {row.d30plus ? formatIDR(row.d30plus) : "—"}
                      </TD>
                      <TD className="num font-semibold">{formatIDR(row.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <div className="border-b border-border p-4">
            <SectionTitle icon={<Building2 className="h-4 w-4 text-muted-foreground" />} title="Umur utang usaha (AP)" hint={`${formatIDR(ledger.payable, { compact: true })}`} />
          </div>
          {ledger.apAging.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Tidak ada utang jatuh tempo.</p>
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Pemasok</TH>
                    <TH>0–14</TH>
                    <TH>15–30</TH>
                    <TH>&gt;30</TH>
                    <TH>Total</TH>
                  </TR>
                </THead>
                <TBody>
                  {ledger.apAging.map((row) => (
                    <TR key={row.party}>
                      <TD className="text-sm">{row.party}</TD>
                      <TD className="num text-xs">{row.d0_14 ? formatIDR(row.d0_14) : "—"}</TD>
                      <TD className="num text-xs">{row.d15_30 ? formatIDR(row.d15_30) : "—"}</TD>
                      <TD className={cn("num text-xs font-semibold", row.d30plus > 0 && "text-rose-600")}>
                        {row.d30plus ? formatIDR(row.d30plus) : "—"}
                      </TD>
                      <TD className="num font-semibold">{formatIDR(row.total)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: string;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className={cn("py-2.5", bold ? "font-bold" : "text-muted-foreground")}>{label}</td>
      <td className={cn("num py-2.5 text-right font-semibold", bold && "text-sm", tone)}>
        {formatIDR(value)}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Master data                                                          */
/* ------------------------------------------------------------------ */

export function MastersView({ stock }: DemoViewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <SectionTitle icon={<Package className="h-4 w-4 text-muted-foreground" />} title="Barang & jasa" hint={`${DEMO_ITEMS.length} data`} />
        <ul className="max-h-72 space-y-2 overflow-auto scroll-thin pr-1">
          {DEMO_ITEMS.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="num text-xs text-muted-foreground">
                  {item.sku} • {item.category}
                </p>
              </div>
              <p className="num shrink-0 text-sm font-semibold">
                {formatNumber(stock.get(item.id) ?? item.stock)} {item.unit}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} title="Pelanggan" hint={`${DEMO_CUSTOMERS.length} data`} />
        <ul className="space-y-2">
          {DEMO_CUSTOMERS.map((customer) => (
            <li key={customer.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{customer.name}</p>
                <p className="num text-xs text-muted-foreground">
                  {customer.code} • {customer.city}
                </p>
              </div>
              <p className="num shrink-0 text-xs text-muted-foreground">{customer.phone}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={<Building2 className="h-4 w-4 text-muted-foreground" />} title="Pemasok" hint={`${DEMO_SUPPLIERS.length} data`} />
        <ul className="space-y-2">
          {DEMO_SUPPLIERS.map((supplier) => (
            <li key={supplier.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{supplier.name}</p>
                <p className="num text-xs text-muted-foreground">
                  {supplier.code} • {supplier.city}
                </p>
              </div>
              <p className="num shrink-0 text-xs text-muted-foreground">{supplier.phone}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <SectionTitle icon={<Warehouse className="h-4 w-4 text-muted-foreground" />} title="Gudang" hint={`${DEMO_WAREHOUSES.length} lokasi`} />
        <ul className="space-y-2">
          {DEMO_WAREHOUSES.map((warehouse) => (
            <li key={warehouse.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2">
              <p className="text-sm font-medium">{warehouse.name}</p>
              <Badge variant="success">Aktif</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Master data pada mode demo bersifat contoh. Akun sungguhan mendapat Chart of Accounts,
          akun pajak, serta akun kas/bank otomatis saat pendaftaran.
        </p>
      </Card>
    </div>
  );
}