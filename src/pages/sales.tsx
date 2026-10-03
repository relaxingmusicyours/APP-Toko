import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  Banknote,
  Boxes,
  Eye,
  FileText,
  Plus,
  Printer,
  Receipt,
  ScrollText,
  Trash2,
  Undo2,
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
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Loading, PageHeader, Stat, Tabs } from "@/components/ui/misc";
import { SalesMenu } from "@/components/sales-menu";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import {
  cn,
  downloadCSV,
  errorMessage,
  formatDate,
  formatIDR,
  todayISO,
} from "@/lib/utils";
import { useViewTarget } from "@/lib/view-target";

interface LineDraft {
  itemId: string;
  qty: number;
  price: number;
  discount: number;
}

export default function Sales() {
  const navigate = useNavigate();
  const invoices = useQuery(api.sales.listInvoices);
  const customers = useQuery(api.masters.customers);
  const items = useQuery(api.masters.items);
  const accounts = useQuery(api.accounts.cashBankAccounts);
  const createInvoice = useMutation(api.sales.createInvoice);
  const recordReceipt = useMutation(api.sales.recordReceipt);
  const voidInvoice = useMutation(api.sales.voidInvoice);
  const returns = useQuery(api.returns.listReturns);

  const [tab, setTab] = React.useState("all");
  const [detailId, setDetailId] = React.useState<Id<"salesInvoices"> | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [payTarget, setPayTarget] = React.useState<{ id: Id<"salesInvoices">; remaining: number; number: string } | null>(null);
  const [returnTarget, setReturnTarget] = React.useState<{ id: Id<"salesInvoices">; number: string } | null>(null);

  // form state
  const [date, setDate] = React.useState(todayISO());
  const [dueDate, setDueDate] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [walkInName, setWalkInName] = React.useState("");
  const [sourceRef, setSourceRef] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [lines, setLines] = React.useState<LineDraft[]>([{ itemId: "", qty: 1, price: 0, discount: 0 }]);
  const [pending, setPending] = React.useState(false);

  // payment state
  const [payAmount, setPayAmount] = React.useState<number | "">("");
  const [payMethod, setPayMethod] = React.useState("Transfer");
  const [payAccountId, setPayAccountId] = React.useState("");
  const [payPending, setPayPending] = React.useState(false);

  const itemById = React.useMemo(
    () => new Map((items ?? []).map((item: any) => [item._id, item])),
    [items],
  );

  const counts = {
    all: (invoices ?? []).length,
    posted: (invoices ?? []).filter((inv: any) => inv.status === "posted").length,
    paid: (invoices ?? []).filter((inv: any) => inv.status === "paid").length,
    void: (invoices ?? []).filter((inv: any) => inv.status === "void").length,
  };

  const filtered = (invoices ?? []).filter((inv: any) =>
    tab === "all" ? true : inv.status === tab,
  );

  const totals = (invoices ?? []).reduce(
    (acc: { value: number; outstanding: number }, inv: any) => {
      if (inv.status !== "void") {
        acc.value += inv.total;
        acc.outstanding += inv.total - inv.paid;
      }
      return acc;
    },
    { value: 0, outstanding: 0 },
  );

  const formSubtotal = lines.reduce((s, line) => {
    const item = itemById.get(line.itemId as Id<"items">);
    if (!item) return s;
    const gross = line.qty * line.price;
    return s + (gross - Math.min(line.discount, gross));
  }, 0);
  const formTax = lines.reduce((s, line) => {
    const item = itemById.get(line.itemId as Id<"items">);
    if (!item) return s;
    const gross = line.qty * line.price;
    const amount = gross - Math.min(line.discount, gross);
    return s + Math.round((amount * item.taxRate) / 100);
  }, 0);
  const formTotal = formSubtotal + formTax;

  const setLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addItemLine = () => {
    setLines((prev) => [...prev, { itemId: "", qty: 1, price: 0, discount: 0 }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const openForm = () => {
    setDate(todayISO());
    setDueDate("");
    setCustomerId("");
    setWalkInName("");
    setSourceRef("");
    setMemo("");
    setLines([{ itemId: "", qty: 1, price: 0, discount: 0 }]);
    setFormOpen(true);
  };

  // Dipicu dari pop-up pemilihan dokumen di sidebar.
  useViewTarget((view) => {
    if (view === "invoice") openForm();
    else if (view === "posted" || view === "retur") setTab(view);
  });

  const submitInvoice = async () => {
    const validLines = lines.filter((line) => line.itemId && line.qty > 0);
    if (!customerId && !walkInName.trim()) {
      toast.error("Pilih pelanggan atau isi nama pembeli");
      return;
    }
    if (validLines.length === 0) {
      toast.error("Tambahkan minimal satu baris barang");
      return;
    }
    setPending(true);
    try {
      const result = await createInvoice({
        date,
        dueDate: dueDate || undefined,
        customerId: (customerId || undefined) as Id<"customers"> | undefined,
        customerName: customerId ? undefined : walkInName,
        sourceRef: sourceRef || undefined,
        memo: memo || undefined,
        lines: validLines.map((line) => ({
          itemId: line.itemId as Id<"items">,
          qty: line.qty,
          price: line.price,
          discount: line.discount,
        })),
      });
      toast.success(`Faktur ${result.number} tercatat — jurnal otomatis diposting`);
      setFormOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const openPayment = (inv: { _id: Id<"salesInvoices">; number: string; total: number; paid: number }) => {
    setPayTarget({ id: inv._id, remaining: inv.total - inv.paid, number: inv.number });
    setPayAmount(inv.total - inv.paid);
    setPayMethod("Transfer");
    setPayAccountId(accounts?.[0]?._id ?? "");
  };

  const submitPayment = async () => {
    if (!payTarget) return;
    if (!payAccountId) {
      toast.error("Pilih akun kas/bank tujuan");
      return;
    }
    setPayPending(true);
    try {
      const result = await recordReceipt({
        invoiceId: payTarget.id,
        date: todayISO(),
        amount: Number(payAmount),
        method: payMethod,
        accountId: payAccountId as Id<"accounts">,
      });
      toast.success(`Penerimaan ${result.number} tercatat. Sisa piutang ${formatIDR(result.remaining)}`);
      setPayTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPayPending(false);
    }
  };

  const submitVoid = async (inv: { _id: Id<"salesInvoices">; number: string; paid: number }) => {
    if (inv.paid > 0) {
      toast.error("Faktur sudah ada penerimaan — batalkan via jurnal koreksi.");
      return;
    }
    const reason = window.prompt(`Alasan pembatalan ${inv.number}:`, "Salah input");
    if (!reason) return;
    try {
      await voidInvoice({ invoiceId: inv._id, reason });
      toast.success(`${inv.number} dibatalkan dengan jurnal reversal`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ["No", "Tanggal", "Jatuh Tempo", "Pelanggan", "Subtotal", "PPN", "Total", "Dibayar", "Status"],
    ];
    for (const inv of filtered) {
      rows.push([
        inv.number,
        inv.date,
        inv.dueDate ?? "-",
        inv.customerName,
        inv.subtotal,
        inv.taxTotal,
        inv.total,
        inv.paid,
        inv.status,
      ]);
    }
    downloadCSV("penjualan.csv", rows);
  };

  if (invoices === undefined || returns === undefined) {
    return <Loading label="Memuat faktur penjualan…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Penjualan"
        description="Order-to-cash: faktur, penerimaan, retur pembatalan, dan piutang pelanggan."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <FileText className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="accent" size="sm" onClick={openForm}>
              <Plus className="h-3.5 w-3.5" /> Faktur Baru
            </Button>
          </>
        }
      />

      <SalesMenu
        onNewInvoice={openForm}
        onShowReceipts={() => setTab("posted")}
        onShowReturns={() => setTab("retur")}
        onOpenCustomers={() => navigate("/app/master-data")}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Penjualan" value={formatIDR(totals.value, { compact: true })} />
        <Stat label="Piutang Outstanding" value={formatIDR(totals.outstanding, { compact: true })} tone="warning" />
        <Stat label="Jumlah Faktur" value={counts.all} hint={`${counts.paid} lunas • ${counts.posted} belum lunas`} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "Semua", count: counts.all },
          { value: "posted", label: "Belum Lunas", count: counts.posted },
          { value: "paid", label: "Lunas", count: counts.paid },
          { value: "retur", label: "Retur", count: returns.length },
          { value: "void", label: "Void", count: counts.void },
        ]}
      />

      {tab === "retur" ? (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>No. Retur</TH>
                  <TH>Tanggal</TH>
                  <TH>Ref Faktur</TH>
                  <TH>Pelanggan</TH>
                  <TH>Alasan</TH>
                  <TH className="text-right">Nilai Retur</TH>
                  <TH>Stok</TH>
                </TR>
              </THead>
              <TBody>
                {returns.length === 0 ? (
                  <TR>
                    <TD colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada retur penjualan. Gunakan tombol Retur pada faktur untuk membuat credit note.
                    </TD>
                  </TR>
                ) : (
                  returns.map((row: any) => (
                    <TR key={row._id}>
                      <TD className="num font-semibold">{row.number}</TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatDate(row.date)}</TD>
                      <TD className="num text-xs text-muted-foreground">{row.invoiceNumber}</TD>
                      <TD className="font-medium">{row.customerName}</TD>
                      <TD className="max-w-[200px] truncate text-muted-foreground">
                        {row.reason ?? "-"}
                      </TD>
                      <TD className="num text-right font-bold text-rose-600">{formatIDR(row.total)}</TD>
                      <TD>
                        {row.restock ? (
                          <Badge variant="success">Kembali</Badge>
                        ) : (
                          <Badge variant="outline">Tanpa stok</Badge>
                        )}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}

      {tab !== "retur" && filtered.length === 0 ? (
        <EmptyState
          title="Belum ada faktur"
          description="Buat faktur penjualan pertama Anda, atau gunakan Kasir POS untuk penjualan tunai."
          icon={<Receipt className="h-8 w-8" />}
          action={
            <Button variant="accent" onClick={openForm}>
              <Plus className="h-4 w-4" /> Buat Faktur
            </Button>
          }
        />
      ) : tab !== "retur" ? (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>No. Faktur</TH>
                  <TH>Tanggal</TH>
                  <TH>Pelanggan</TH>
                  <TH>Ref</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Sisa</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((inv: any) => (
                  <TR key={inv._id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        {inv.isPos ? <Badge variant="info">POS</Badge> : null}
                        <span className="num font-semibold">{inv.number}</span>
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDate(inv.date)}</TD>
                    <TD className="font-medium">{inv.customerName}</TD>
                    <TD className="num text-xs text-muted-foreground">{inv.sourceRef ?? "-"}</TD>
                    <TD className="num text-right font-bold">{formatIDR(inv.total)}</TD>
                    <TD className="num text-right">
                      {inv.status === "void" ? "-" : formatIDR(inv.total - inv.paid)}
                    </TD>
                    <TD>
                      <StatusChip status={inv.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Detail"
                          onClick={() => setDetailId(inv._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {inv.status === "posted" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Terima pembayaran"
                            onClick={() => openPayment(inv)}
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {inv.status !== "void" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Retur penjualan"
                            onClick={() => setReturnTarget({ id: inv._id, number: inv.number })}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {inv.status !== "void" && inv.paid === 0 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Void"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => submitVoid(inv)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}

      {/* CREATE INVOICE */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Faktur Penjualan Baru"
        description="Debit Piutang, Kredit Pendapatan + PPN Keluaran, HPP otomatis."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitInvoice} disabled={pending}>
              {pending ? "Memposting…" : `Posting Faktur • ${formatIDR(formTotal)}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tanggal">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Jatuh Tempo">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="No. Referensi (SO/DO)">
              <Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="SO-0001" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pelanggan">
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">— Penjual langsung / isi manual —</option>
                {(customers ?? []).map((customer: any) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.code} • {customer.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nama Pembeli (jika bukan pelanggan terdaftar)">
              <Input
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Contoh: Pembeli Umum"
                disabled={!!customerId}
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Baris Barang
              </p>
              <Button variant="subtle" size="sm" onClick={addItemLine}>
                <Plus className="h-3.5 w-3.5" /> Tambah Baris
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const item = itemById.get(line.itemId as Id<"items">);
                return (
                  <div
                    key={index}
                    className={cn(
                      "grid gap-2 rounded-xl border border-border p-2.5",
                      "grid-cols-[1fr_80px_120px_100px_36px] items-center",
                    )}
                  >
                    <Select
                      value={line.itemId}
                      onChange={(e) => {
                        const selected = itemById.get(e.target.value as Id<"items">);
                        setLine(index, {
                          itemId: e.target.value,
                          price: selected?.salePrice ?? 0,
                        });
                      }}
                      className="h-9"
                    >
                      <option value="">Pilih barang…</option>
                      {(items ?? []).map((it: any) => (
                        <option key={it._id} value={it._id}>
                          {it.sku} • {it.name}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => setLine(index, { qty: Number(e.target.value) || 0 })}
                      className="h-9 text-center"
                      placeholder="Qty"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={line.price}
                      onChange={(e) => setLine(index, { price: Number(e.target.value) || 0 })}
                      className="h-9 text-right"
                      placeholder="Harga"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={line.discount}
                      onChange={(e) => setLine(index, { discount: Number(e.target.value) || 0 })}
                      className="h-9 text-right"
                      placeholder="Diskon"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      className="text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {item ? (
                      <p className="col-span-5 -mt-1 text-[11px] text-muted-foreground">
                        {item.trackStock ? `Stok dipotong saat posting. ` : "Jasa — tanpa stok. "}
                        PPN {item.taxRate}%
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Memo / Catatan">
              <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Catatan faktur…" />
            </Field>
            <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="num font-semibold">{formatIDR(formSubtotal)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">PPN</span>
                <span className="num font-semibold">{formatIDR(formTax)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base">
                <span className="font-bold">Total</span>
                <span className="num font-extrabold">{formatIDR(formTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* PAYMENT DIALOG */}
      <Dialog
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={`Terima Pembayaran ${payTarget?.number ?? ""}`}
        description="Debit Kas/Bank, Kredit Piutang Usaha."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayTarget(null)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitPayment} disabled={payPending}>
              {payPending ? "Memproses…" : "Catat Penerimaan"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-secondary p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa tagihan</span>
              <span className="num font-bold">{formatIDR(payTarget?.remaining ?? 0)}</span>
            </div>
          </div>
          <Field label="Nominal">
            <Input
              type="number"
              min={1}
              max={payTarget?.remaining}
              value={payAmount}
              onChange={(e) => (e.target.value === "" ? setPayAmount("") : setPayAmount(Number(e.target.value)))}
            />
          </Field>
          <Field label="Metode">
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option>Transfer</option>
              <option>Tunai</option>
              <option>QRIS</option>
              <option>E-Wallet</option>
            </Select>
          </Field>
          <Field label="Akun Kas/Bank">
            <Select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)}>
              {(accounts ?? []).map((account: any) => (
                <option key={account._id} value={account._id}>
                  {account.code} • {account.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      {/* DETAIL */}
      <InvoiceDetail invoiceId={detailId} onClose={() => setDetailId(null)} />
      <ReturnDialog
        target={returnTarget}
        onClose={() => setReturnTarget(null)}
        onDone={(number) => {
          setTab("retur");
          toast.success(`Retur ${number} diposting sebagai credit note`);
        }}
      />
    </div>
  );
}

function InvoiceDetail({
  invoiceId,
  onClose,
}: {
  invoiceId: Id<"salesInvoices"> | null;
  onClose: () => void;
}) {
  const detail = useQuery(api.sales.getInvoice, invoiceId ? { invoiceId } : "skip");

  if (!invoiceId || detail === undefined) {
    return invoiceId ? <Loading /> : null;
  }
  if (!detail) return null;

  const { invoice, lines, receipts, entry } = detail;

  return (
    <Dialog open={!!invoiceId} onClose={onClose} title={`Faktur ${invoice.number}`} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
          <div className="grid gap-1 text-sm">
            <span className="font-bold">{invoice.customerName}</span>
            <span className="text-muted-foreground">
              Tanggal {formatDate(invoice.date)}
              {invoice.dueDate ? ` • Jatuh tempo ${formatDate(invoice.dueDate)}` : ""}
            </span>
            {invoice.sourceRef ? (
              <span className="text-muted-foreground">Ref: {invoice.sourceRef}</span>
            ) : null}
            {invoice.memo ? <span className="text-muted-foreground">{invoice.memo}</span> : null}
          </div>
          <div className="text-right">
            <StatusChip status={invoice.status} />
            <p className="num mt-2 text-2xl font-extrabold">{formatIDR(invoice.total)}</p>
            <p className="num text-xs text-muted-foreground">
              Dibayar {formatIDR(invoice.paid)} • Sisa {formatIDR(invoice.total - invoice.paid)}
            </p>
          </div>
        </div>

        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-right">Harga</TH>
                <TH className="text-right">Diskon</TH>
                <TH className="text-right">PPN</TH>
                <TH className="text-right">Jumlah</TH>
              </TR>
            </THead>
            <TBody>
              {lines.map((line: any) => (
                <TR key={line._id}>
                  <TD>
                    <p className="font-semibold">{line.name}</p>
                    <p className="num text-xs text-muted-foreground">{line.sku}</p>
                  </TD>
                  <TD className="num text-right">
                    {line.qty} {line.unit}
                  </TD>
                  <TD className="num text-right">{formatIDR(line.price)}</TD>
                  <TD className="num text-right">{formatIDR(line.discount)}</TD>
                  <TD className="num text-right">{line.taxRate}%</TD>
                  <TD className="num text-right font-semibold">{formatIDR(line.amount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>

        {receipts.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Banknote className="h-3.5 w-3.5" /> Riwayat Penerimaan
            </p>
            <div className="space-y-1.5">
              {receipts.map((receipt: any) => (
                <div
                  key={receipt._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="num font-semibold">{receipt.number}</span>
                  <span className="text-muted-foreground">
                    {formatDate(receipt.date)} • {receipt.method}
                  </span>
                  <span className="num font-bold text-emerald-600">{formatIDR(receipt.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {entry ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5" /> Jurnal {entry.number} (debit = kredit)
            </p>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <THead>
                  <TR>
                    <TH>Akun</TH>
                    <TH className="text-right">Debit</TH>
                    <TH className="text-right">Kredit</TH>
                  </TR>
                </THead>
                <TBody>
                  {entry.lines.map((line: any) => (
                    <TR key={line._id}>
                      <TD>
                        <span className="num text-xs text-muted-foreground">{line.accountCode}</span>{" "}
                        {line.accountName}
                      </TD>
                      <TD className="num text-right">{line.debit ? formatIDR(line.debit) : "-"}</TD>
                      <TD className="num text-right">{line.credit ? formatIDR(line.credit) : "-"}</TD>
                    </TR>
                  ))}
                  <TR className="bg-secondary/50 font-bold">
                    <TD>Total</TD>
                    <TD className="num text-right">{formatIDR(entry.totalDebit)}</TD>
                    <TD className="num text-right">{formatIDR(entry.totalCredit)}</TD>
                  </TR>
                </TBody>
              </Table>
            </div>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function ReturnDialog({
  target,
  onClose,
  onDone,
}: {
  target: { id: Id<"salesInvoices">; number: string } | null;
  onClose: () => void;
  onDone: (number: string) => void;
}) {
  const detail = useQuery(api.sales.getInvoice, target ? { invoiceId: target.id } : "skip");
  const createReturn = useMutation(api.returns.createReturn);
  const [qtys, setQtys] = React.useState<Record<string, number>>({});
  const [date, setDate] = React.useState(todayISO());
  const [reason, setReason] = React.useState("");
  const [restock, setRestock] = React.useState(true);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setQtys({});
    setReason("");
    setRestock(true);
    setDate(todayISO());
  }, [target?.id]);

  const lines = detail?.lines ?? [];
  const estimate = lines.reduce(
    (acc, line: any) => {
      const qty = qtys[line._id] ?? 0;
      if (qty <= 0) return acc;
      const ratio = line.qty > 0 ? qty / line.qty : 0;
      const amount = Math.round(line.amount * ratio);
      acc.subtotal += amount;
      acc.tax += Math.round((amount * line.taxRate) / 100);
      return acc;
    },
    { subtotal: 0, tax: 0 },
  );
  const estimateTotal = estimate.subtotal + estimate.tax;

  const submit = async () => {
    if (!target) return;
    const payload = Object.entries(qtys)
      .map(([lineId, qty]) => ({ invoiceLineId: lineId as Id<"salesInvoiceLines">, qty }))
      .filter((line) => line.qty > 0);
    if (payload.length === 0) {
      toast.error("Isi minimal satu qty retur");
      return;
    }
    setPending(true);
    try {
      const result = await createReturn({
        invoiceId: target.id,
        date,
        reason: reason || undefined,
        restock,
        lines: payload,
      });
      onDone(result.number);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={`Retur Penjualan ${target?.number ?? ""}`}
      description="Credit note: reversing pendapatan & PPN, mengurangi piutang, mengembalikan stok dan HPP."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending || estimateTotal === 0}>
            {pending ? "Memposting…" : `Posting Retur • ${formatIDR(estimateTotal)}`}
          </Button>
        </>
      }
    >
      {detail === undefined ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal Retur">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Alasan">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Barang rusak / salah ukuran…"
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <Boxes className="h-4 w-4 text-muted-foreground" />
            Kembalikan barang ke gudang (men_cancel HPP)
          </label>

          <div className="overflow-hidden rounded-xl border border-border">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Barang</TH>
                    <TH className="text-right">Terjual</TH>
                    <TH className="text-right">Retur</TH>
                    <TH className="text-right">Nilai</TH>
                  </TR>
                </THead>
                <TBody>
                  {lines.map((line: any) => {
                    const qty = qtys[line._id] ?? 0;
                    const ratio = line.qty > 0 ? qty / line.qty : 0;
                    return (
                      <TR key={line._id}>
                        <TD>
                          <p className="font-semibold">{line.name}</p>
                          <p className="num text-xs text-muted-foreground">{line.sku}</p>
                        </TD>
                        <TD className="num text-right text-muted-foreground">
                          {line.qty} {line.unit}
                        </TD>
                        <TD className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={line.qty}
                            value={qty || ""}
                            onChange={(e) =>
                              setQtys((prev) => ({
                                ...prev,
                                [line._id]: Math.min(
                                  Number(e.target.value) || 0,
                                  line.qty,
                                ),
                              }))
                            }
                            placeholder="0"
                            className="h-8 w-24 text-right"
                          />
                        </TD>
                        <TD className="num text-right font-semibold">
                          {qty > 0 ? formatIDR(Math.round(line.amount * ratio)) : "-"}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
          </div>

          <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nilai barang retur</span>
              <span className="num font-semibold">{formatIDR(estimate.subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">PPN keluaran retur</span>
              <span className="num font-semibold">{formatIDR(estimate.tax)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total Credit Note</span>
              <span className="num">{formatIDR(estimateTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
