import { useMutation, useQuery } from "convex/react";
import {
  Banknote,
  CreditCard,
  Minus,
  Package,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge, StatusChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, Loading, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import {
  cn,
  currentMonthISO,
  downloadCSV,
  errorMessage,
  formatDate,
  formatIDR,
  formatNumber,
  todayISO,
} from "@/lib/utils";

interface CartLine {
  itemId: Id<"items">;
  sku: string;
  name: string;
  unit: string;
  price: number;
  taxRate: number;
  qty: number;
  trackStock: boolean;
}

const METHODS = [
  { id: "Cash", label: "Tunai", icon: Banknote },
  { id: "QRIS", label: "QRIS", icon: QrCode },
  { id: "Transfer", label: "Transfer", icon: CreditCard },
];

export default function Pos() {
  const navigate = useNavigate();
  const items = useQuery(api.masters.items);
  const stockReport = useQuery(api.inventory.stockReport);
  const warehouses = useQuery(api.masters.warehouses);
  const customers = useQuery(api.masters.customers);
  const checkout = useMutation(api.pos.checkout);

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [discount, setDiscount] = React.useState(0);
  const [customerId, setCustomerId] = React.useState<string>("");
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [payOpen, setPayOpen] = React.useState(false);
  const [method, setMethod] = React.useState("Cash");
  const [received, setReceived] = React.useState<number | "">("");
  const [pending, setPending] = React.useState(false);
  const [receipt, setReceipt] = React.useState<{
    number: string;
    total: number;
    change: number;
    lines: Array<CartLine & { amount: number; discount: number; tax: number }>;
    discount: number;
    taxTotal: number;
    subtotal: number;
    method: string;
  } | null>(null);

  const categories = React.useMemo(() => {
    const set = new Set((items ?? []).map((item: any) => item.category ?? "Lainnya"));
    return ["all", ...Array.from(set)];
  }, [items]);

  const qtyByItem = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockReport?.rows ?? []) map.set(row._id, row.qty);
    return map;
  }, [stockReport]);

  const filtered = React.useMemo(() => {
    const query = search.toLowerCase();
    return (items ?? []).filter((item: any) => {
      if (!item.isActive) return false;
      if (category !== "all" && (item.category ?? "Lainnya") !== category) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query)
      );
    });
  }, [items, search, category]);

  const subtotal = cart.reduce((s, line) => s + line.qty * line.price, 0);
  const cappedDiscount = Math.min(Math.max(discount, 0), subtotal);
  // Mirrors the server calculation so the register total always matches the posted invoice.
  const lineBreakdown = cart.map((line) => {
    const gross = line.qty * line.price;
    const share = subtotal > 0 ? gross / subtotal : 0;
    const lineDiscount = Math.round(cappedDiscount * share);
    const amount = gross - lineDiscount;
    return {
      ...line,
      amount,
      discount: lineDiscount,
      tax: Math.round((amount * line.taxRate) / 100),
    };
  });
  const afterDiscount = lineBreakdown.reduce((s, line) => s + line.amount, 0);
  const taxTotal = lineBreakdown.reduce((s, line) => s + line.tax, 0);
  const total = afterDiscount + taxTotal;
  const changeValue = received === "" ? 0 : Math.max(0, Number(received) - total);
  const shortValue = received === "" ? 0 : Math.max(0, total - Number(received));

  React.useEffect(() => {
    if (warehouses?.length && !warehouseId) {
      setWarehouseId(warehouses[0]._id);
    }
  }, [warehouses, warehouseId]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.itemId === item._id);
      if (existing) {
        return prev.map((line) =>
          line.itemId === item._id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          itemId: item._id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          price: item.salePrice,
          taxRate: item.taxRate,
          qty: 1,
          trackStock: item.trackStock,
        },
      ];
    });
  };

  const changeQty = (itemId: Id<"items">, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => (line.itemId === itemId ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (itemId: Id<"items">) => {
    setCart((prev) => prev.filter((line) => line.itemId !== itemId));
  };

  const openPayment = () => {
    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }
    setReceived("");
    setPayOpen(true);
  };

  const confirmCheckout = async () => {
    if (method !== "Cash" && (received === "" || Number(received) < total)) {
      toast.error("Nominal diterima kurang dari total");
      return;
    }
    setPending(true);
    try {
      const result = await checkout({
        date: todayISO(),
        warehouseId: (warehouseId || undefined) as Id<"warehouses"> | undefined,
        customerId: (customerId || undefined) as Id<"customers"> | undefined,
        lines: cart.map((line) => ({ itemId: line.itemId, qty: line.qty, price: line.price })),
        payments: [
          {
            method,
            accountId: undefined,
            amount: received === "" ? total : Number(received),
          },
        ],
        discount: cappedDiscount,
      });
      setReceipt({
        number: result.number,
        total: result.total,
        change: result.change,
        lines: lineBreakdown,
        discount: cappedDiscount,
        taxTotal,
        subtotal: afterDiscount,
        method,
      });
      setCart([]);
      setDiscount(0);
      setCustomerId("");
      setPayOpen(false);
      setReceived("");
      toast.success(`Transaksi ${result.number} berhasil`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (items === undefined || stockReport === undefined) {
    return <Loading label="Menyiapkan kasir…" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kasir POS"
        description="Checkout cepat — stok dan jurnal otomatis mengikuti setiap transaksi."
        actions={
          <Badge variant="lime">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {/* PRODUCT GRID */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang atau SKU…"
                className="pl-9"
              />
            </div>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-auto min-w-[150px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "Semua kategori" : cat}
                </option>
              ))}
            </Select>
          </div>

          {filtered.length === 0 ? (
            items.length === 0 ? (
              <EmptyState
                title="Belum ada barang untuk dijual"
                description="Tambahkan barang atau jasa dulu di menu Master Data, lalu barangnya langsung muncul di grid kasir ini."
                icon={<Package className="h-8 w-8" />}
                action={
                  <Button variant="accent" size="sm" onClick={() => navigate("/app/master-data")}>
                    <Package className="h-3.5 w-3.5" /> Buka Master Data
                  </Button>
                }
              />
            ) : (
              <EmptyState title="Barang tidak ditemukan" description="Coba kata kunci lain." />
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item: any) => {
                const stock = qtyByItem.get(item._id) ?? 0;
                const out = item.trackStock && stock <= 0;
                return (
                  <button
                    key={item._id}
                    onClick={() => addToCart(item)}
                    disabled={out}
                    className={cn(
                      "group flex flex-col rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                      out && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="num text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {item.sku}
                      </span>
                      {item.trackStock ? (
                        <Badge variant={out ? "danger" : stock <= item.minStock ? "warning" : "outline"}>
                          {formatNumber(stock)} {item.unit}
                        </Badge>
                      ) : (
                        <Badge variant="info">Jasa</Badge>
                      )}
                    </div>
                    <span className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">
                      {item.name}
                    </span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="num text-sm font-bold text-primary">
                        {formatIDR(item.salePrice)}
                      </span>
                      <Plus className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CART */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-navy-950 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gg-lime" />
                <span className="text-sm font-bold">Keranjang</span>
                <Badge variant="lime">{cart.length} item</Badge>
              </div>
              {cart.length > 0 ? (
                <button
                  onClick={() => setCart([])}
                  className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  aria-label="Kosongkan keranjang"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="max-h-[320px] overflow-y-auto scroll-thin p-3">
              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pilih barang di kiri untuk mulai transaksi
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((line) => (
                    <div
                      key={line.itemId}
                      className="rounded-lg border border-border/70 bg-background p-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{line.name}</p>
                          <p className="num text-[11px] text-muted-foreground">
                            {formatIDR(line.price)} / {line.unit}
                          </p>
                        </div>
                        <button
                          onClick={() => removeLine(line.itemId)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => changeQty(line.itemId, -1)}
                            className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-secondary"
                            aria-label="Kurangi"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="num w-8 text-center text-sm font-bold">{line.qty}</span>
                          <button
                            onClick={() => changeQty(line.itemId, 1)}
                            className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-secondary"
                            aria-label="Tambah"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="num text-sm font-bold">
                          {formatIDR(line.qty * line.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="num font-semibold">{formatIDR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Diskon</span>
                <Input
                  type="number"
                  min={0}
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 w-32 text-right"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PPN</span>
                <span className="num font-semibold">{formatIDR(taxTotal)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-navy-950 px-3 py-2.5 text-white">
                <span className="text-sm font-semibold">Total</span>
                <span className="num text-lg font-extrabold text-gg-lime">{formatIDR(total)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-9">
                  <option value="">Pelanggan umum</option>
                  {(customers ?? []).map((customer: any) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
                <Select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="h-9"
                >
                  {(warehouses ?? []).map((wh: any) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Button className="mt-1 w-full" variant="accent" size="lg" onClick={openPayment}>
                <Wallet className="h-4 w-4" /> Bayar
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* RECENT POS SALES */}
      <RecentPosSales />

      {/* PAYMENT DIALOG */}
      <Dialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Pembayaran"
        description={`Total tagihan ${formatIDR(total)}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={confirmCheckout} disabled={pending}>
              {pending ? "Memproses…" : "Selesaikan & Cetak"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMethod(m.id);
                  setReceived(total);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-colors",
                  method === m.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                <m.icon className="h-5 w-5" />
                {m.label}
              </button>
            ))}
          </div>

          <Field label="Uang Diterima">
            <Input
              type="number"
              min={0}
              value={received}
              onChange={(e) => (e.target.value === "" ? setReceived("") : setReceived(Number(e.target.value)))}
              placeholder={String(total)}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {[total, 50_000, 100_000, 200_000].map((amount, index) => (
              <Button key={index} variant="subtle" size="sm" onClick={() => setReceived(amount)}>
                {index === 0 ? "PAS" : formatIDR(amount, { compact: true })}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm font-semibold text-muted-foreground">Kembalian</span>
            <span
              className={cn(
                "num text-xl font-extrabold",
                shortValue > 0 ? "text-destructive" : "text-emerald-600",
              )}
            >
              {shortValue > 0 ? `Kurang ${formatIDR(shortValue)}` : formatIDR(changeValue)}
            </span>
          </div>
        </div>
      </Dialog>

      {/* RECEIPT */}
      <Dialog
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title={`Struk ${receipt?.number ?? ""}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setReceipt(null)}>
              Tutup
            </Button>
            <Button variant="accent" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </>
        }
      >
        {receipt ? (
          <div className="print-area rounded-xl border border-dashed border-border p-5 font-mono text-sm">
            <div className="text-center">
              <p className="text-base font-black tracking-tight">POS GG ONLINE</p>
              <p className="text-xs text-muted-foreground">Struk Penjualan Kasir</p>
            </div>
            <div className="my-3 border-t border-dashed border-border" />
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between">
                <span>No.</span>
                <span className="font-bold">{receipt.number}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>{formatDate(todayISO())}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode</span>
                <span>{receipt.method}</span>
              </div>
            </div>
            <div className="my-3 border-t border-dashed border-border" />
            {receipt.lines.map((line) => (
              <div key={line.itemId} className="py-1 text-xs">
                <p className="font-semibold">{line.name}</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {line.qty} {line.unit} × {formatIDR(line.price)}
                  </span>
                  <span className="num">{formatIDR(line.amount)}</span>
                </div>
              </div>
            ))}
            <div className="my-3 border-t border-dashed border-border" />
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="num">{formatIDR(receipt.subtotal)}</span>
              </div>
              {receipt.discount > 0 ? (
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span className="num">-{formatIDR(receipt.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>PPN</span>
                <span className="num">{formatIDR(receipt.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-black">
                <span>TOTAL</span>
                <span className="num">{formatIDR(receipt.total)}</span>
              </div>
              {receipt.change > 0 ? (
                <div className="flex justify-between font-bold">
                  <span>Kembalian</span>
                  <span className="num">{formatIDR(receipt.change)}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-4 text-center text-xs text-muted-foreground">
              Terima kasih telah berbelanja 🙏
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function RecentPosSales() {
  const invoices = useQuery(api.sales.listInvoices);
  const recent = (invoices ?? []).filter((inv: any) => inv.isPos).slice(0, 5);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [["No", "Tanggal", "Pelanggan", "Total", "Status"]];
    for (const inv of recent) {
      rows.push([inv.number, inv.date, inv.customerName, inv.total, inv.status]);
    }
    downloadCSV(`pos-${currentMonthISO()}.csv`, rows);
  };

  if (!invoices || recent.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-4">
        <p className="text-sm font-bold">Transaksi Kasir Terakhir</p>
        <Button variant="ghost" size="sm" onClick={exportCsv}>
          <Printer className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>
      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>No. Transaksi</TH>
              <TH>Pelanggan</TH>
              <TH className="text-right">Total</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {recent.map((inv: any) => (
              <TR key={inv._id}>
                <TD className="num font-semibold">{inv.number}</TD>
                <TD>{inv.customerName}</TD>
                <TD className="num text-right font-semibold">{formatIDR(inv.total)}</TD>
                <TD>
                  <StatusChip status={inv.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </Card>
  );
}
