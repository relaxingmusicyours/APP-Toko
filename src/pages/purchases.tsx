import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  Banknote,
  Eye,
  FileText,
  Plus,
  ScrollText,
  Trash2,
  Truck,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StatusChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Loading, PageHeader, Stat, Tabs } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { downloadCSV, errorMessage, formatDate, formatIDR, todayISO } from "@/lib/utils";
import { useViewTarget } from "@/lib/view-target";

interface LineDraft {
  itemId: string;
  qty: number;
  price: number;
}

export default function Purchases() {
  const bills = useQuery(api.purchases.listBills);
  const suppliers = useQuery(api.masters.suppliers);
  const items = useQuery(api.masters.items);
  const accounts = useQuery(api.accounts.cashBankAccounts);
  const createBill = useMutation(api.purchases.createBill);
  const recordPayment = useMutation(api.purchases.recordPayment);
  const voidBill = useMutation(api.purchases.voidBill);

  const [tab, setTab] = React.useState("all");
  // Dipicu dari pop-up pemilihan dokumen di sidebar.
  useViewTarget((view) => {
    if (view === "form") openForm();
    else if (view === "all" || view === "posted" || view === "paid") setTab(view);
  });
  const [detailId, setDetailId] = React.useState<Id<"purchaseBills"> | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [payTarget, setPayTarget] = React.useState<{ id: Id<"purchaseBills">; remaining: number; number: string } | null>(null);

  const [date, setDate] = React.useState(todayISO());
  const [supplierId, setSupplierId] = React.useState("");
  const [supplierName, setSupplierName] = React.useState("");
  const [sourceRef, setSourceRef] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [lines, setLines] = React.useState<LineDraft[]>([{ itemId: "", qty: 1, price: 0 }]);
  const [pending, setPending] = React.useState(false);

  const [payAmount, setPayAmount] = React.useState<number | "">("");
  const [payMethod, setPayMethod] = React.useState("Transfer");
  const [payAccountId, setPayAccountId] = React.useState("");
  const [payPending, setPayPending] = React.useState(false);

  const itemById = React.useMemo(
    () => new Map((items ?? []).map((item: any) => [item._id, item])),
    [items],
  );

  const counts = {
    all: (bills ?? []).length,
    posted: (bills ?? []).filter((b: any) => b.status === "posted").length,
    paid: (bills ?? []).filter((b: any) => b.status === "paid").length,
  };

  const filtered = (bills ?? []).filter((bill: any) => (tab === "all" ? true : bill.status === tab));

  const totals = (bills ?? []).reduce(
    (acc: { value: number; outstanding: number }, bill: any) => {
      if (bill.status !== "void") {
        acc.value += bill.total;
        acc.outstanding += bill.total - bill.paid;
      }
      return acc;
    },
    { value: 0, outstanding: 0 },
  );

  const formSubtotal = lines.reduce((s, line) => s + line.qty * line.price, 0);
  const formTax = lines.reduce((s, line) => {
    const item = itemById.get(line.itemId as Id<"items">);
    if (!item) return s;
    return s + Math.round((line.qty * line.price * item.taxRate) / 100);
  }, 0);
  const formTotal = formSubtotal + formTax;

  const setLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const openForm = () => {
    setDate(todayISO());
    setSupplierId("");
    setSupplierName("");
    setSourceRef("");
    setMemo("");
    setLines([{ itemId: "", qty: 1, price: 0 }]);
    setFormOpen(true);
  };

  const submitBill = async () => {
    const validLines = lines.filter((line) => line.itemId && line.qty > 0);
    if (!supplierId && !supplierName.trim()) {
      toast.error("Pilih pemasok atau isi nama pemasok");
      return;
    }
    if (validLines.length === 0) {
      toast.error("Tambahkan minimal satu baris barang");
      return;
    }
    setPending(true);
    try {
      const result = await createBill({
        date,
        supplierId: (supplierId || undefined) as Id<"suppliers"> | undefined,
        supplierName: supplierId ? undefined : supplierName,
        sourceRef: sourceRef || undefined,
        memo: memo || undefined,
        lines: validLines.map((line) => ({
          itemId: line.itemId as Id<"items">,
          qty: line.qty,
          price: line.price,
        })),
      });
      toast.success(`Faktur pembelian ${result.number} tercatat — stok & biaya rata-rata diperbarui`);
      setFormOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const openPayment = (bill: { _id: Id<"purchaseBills">; number: string; total: number; paid: number }) => {
    setPayTarget({ id: bill._id, remaining: bill.total - bill.paid, number: bill.number });
    setPayAmount(bill.total - bill.paid);
    setPayMethod("Transfer");
    setPayAccountId(accounts?.[0]?._id ?? "");
  };

  const submitPayment = async () => {
    if (!payTarget) return;
    if (!payAccountId) {
      toast.error("Pilih akun kas/bank sumber");
      return;
    }
    setPayPending(true);
    try {
      const result = await recordPayment({
        billId: payTarget.id,
        date: todayISO(),
        amount: Number(payAmount),
        method: payMethod,
        accountId: payAccountId as Id<"accounts">,
      });
      toast.success(`Pembayaran ${result.number} tercatat. Sisa utang ${formatIDR(result.remaining)}`);
      setPayTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPayPending(false);
    }
  };

  const submitVoid = async (bill: { _id: Id<"purchaseBills">; number: string; paid: number }) => {
    if (bill.paid > 0) {
      toast.error("Faktur sudah dibayar — gunakan jurnal koreksi manual.");
      return;
    }
    const reason = window.prompt(`Alasan pembatalan ${bill.number}:`, "Salah input");
    if (!reason) return;
    try {
      await voidBill({ billId: bill._id, reason });
      toast.success(`${bill.number} dibatalkan dengan jurnal reversal`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ["No", "Tanggal", "Pemasok", "Ref", "Subtotal", "PPN", "Total", "Dibayar", "Status"],
    ];
    for (const bill of filtered) {
      rows.push([
        bill.number,
        bill.date,
        bill.supplierName,
        bill.sourceRef ?? "-",
        bill.subtotal,
        bill.taxTotal,
        bill.total,
        bill.paid,
        bill.status,
      ]);
    }
    downloadCSV("pembelian.csv", rows);
  };

  if (bills === undefined) return <Loading label="Memuat faktur pembelian…" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pembelian"
        description="Procure-to-pay: faktur pemasok, pembayaran, retur, dan utang dagang."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <FileText className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="accent" size="sm" onClick={openForm}>
              <Plus className="h-3.5 w-3.5" /> Faktur Pembelian
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Pembelian" value={formatIDR(totals.value, { compact: true })} />
        <Stat label="Utang Outstanding" value={formatIDR(totals.outstanding, { compact: true })} tone="warning" />
        <Stat label="Jumlah Faktur" value={counts.all} hint={`${counts.paid} lunas • ${counts.posted} belum lunas`} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "Semua", count: counts.all },
          { value: "posted", label: "Belum Lunas", count: counts.posted },
          { value: "paid", label: "Lunas", count: counts.paid },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum ada faktur pembelian"
          description="Catat pembelian barang dagang agar stok dan HPP akurat."
          icon={<Truck className="h-8 w-8" />}
          action={
            <Button variant="accent" onClick={openForm}>
              <Plus className="h-4 w-4" /> Buat Faktur Pembelian
            </Button>
          }
        />
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>No. Faktur</TH>
                  <TH>Tanggal</TH>
                  <TH>Pemasok</TH>
                  <TH>Ref PO</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Sisa</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Aksi</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((bill: any) => (
                  <TR key={bill._id}>
                    <TD className="num font-semibold">{bill.number}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDate(bill.date)}</TD>
                    <TD className="font-medium">{bill.supplierName}</TD>
                    <TD className="num text-xs text-muted-foreground">{bill.sourceRef ?? "-"}</TD>
                    <TD className="num text-right font-bold">{formatIDR(bill.total)}</TD>
                    <TD className="num text-right">
                      {bill.status === "void" ? "-" : formatIDR(bill.total - bill.paid)}
                    </TD>
                    <TD>
                      <StatusChip status={bill.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Detail" onClick={() => setDetailId(bill._id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {bill.status === "posted" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Bayar"
                            onClick={() => openPayment(bill)}
                          >
                            <Banknote className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {bill.status !== "void" && bill.paid === 0 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Void"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => submitVoid(bill)}
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
      )}

      {/* CREATE BILL */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Faktur Pembelian Baru"
        description="Debit Persediaan + PPN Masukan, Kredit Utang Usaha. Biaya rata-rata diperbarui otomatis."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitBill} disabled={pending}>
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
            <Field label="No. Referensi (PO)">
              <Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="PO-0001" />
            </Field>
            <Field label="Memo">
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Catatan…" />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pemasok">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— Isi manual —</option>
                {(suppliers ?? []).map((supplier: any) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.code} • {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nama Pemasok (jika belum terdaftar)">
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Nama pemasok baru"
                disabled={!!supplierId}
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Baris Barang
              </p>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setLines((prev) => [...prev, { itemId: "", qty: 1, price: 0 }])}
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Baris
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line, index) => {
                const item = itemById.get(line.itemId as Id<"items">);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_80px_120px_36px] items-center gap-2 rounded-xl border border-border p-2.5"
                  >
                    <Select
                      value={line.itemId}
                      onChange={(e) => {
                        const selected = itemById.get(e.target.value as Id<"items">);
                        setLine(index, { itemId: e.target.value, price: selected?.costPrice ?? 0 });
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
                      placeholder="Harga beli"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
                      }
                      className="text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {item ? (
                      <p className="col-span-4 -mt-1 text-[11px] text-muted-foreground">
                        Harga terakhir {formatIDR(item.costPrice)} • biaya rata-rata bergerak diterapkan saat
                        posting
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="num font-semibold">{formatIDR(formSubtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">PPN Masukan</span>
              <span className="num font-semibold">{formatIDR(formTax)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base">
              <span className="font-bold">Total</span>
              <span className="num font-extrabold">{formatIDR(formTotal)}</span>
            </div>
          </div>
        </div>
      </Dialog>

      {/* PAYMENT */}
      <Dialog
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={`Bayar ${payTarget?.number ?? ""}`}
        description="Debit Utang Usaha, Kredit Kas/Bank."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayTarget(null)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitPayment} disabled={payPending}>
              {payPending ? "Memproses…" : "Catat Pembayaran"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-secondary p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa utang</span>
              <span className="num font-bold">{formatIDR(payTarget?.remaining ?? 0)}</span>
            </div>
          </div>
          <Field label="Nominal">
            <Input
              type="number"
              min={1}
              value={payAmount}
              onChange={(e) => (e.target.value === "" ? setPayAmount("") : setPayAmount(Number(e.target.value)))}
            />
          </Field>
          <Field label="Metode">
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option>Transfer</option>
              <option>Tunai</option>
              <option>Cek/Giro</option>
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

      <BillDetail billId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function BillDetail({ billId, onClose }: { billId: Id<"purchaseBills"> | null; onClose: () => void }) {
  const detail = useQuery(api.purchases.getBill, billId ? { billId } : "skip");
  if (!billId || detail === undefined) return billId ? <Loading /> : null;
  if (!detail) return null;
  const { bill, lines, payments, entry } = detail;

  return (
    <Dialog open={!!billId} onClose={onClose} title={`Faktur Pembelian ${bill.number}`} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-4">
          <div className="grid gap-1 text-sm">
            <span className="font-bold">{bill.supplierName}</span>
            <span className="text-muted-foreground">Tanggal {formatDate(bill.date)}</span>
            {bill.sourceRef ? <span className="text-muted-foreground">Ref: {bill.sourceRef}</span> : null}
            {bill.memo ? <span className="text-muted-foreground">{bill.memo}</span> : null}
          </div>
          <div className="text-right">
            <StatusChip status={bill.status} />
            <p className="num mt-2 text-2xl font-extrabold">{formatIDR(bill.total)}</p>
            <p className="num text-xs text-muted-foreground">
              Dibayar {formatIDR(bill.paid)} • Sisa {formatIDR(bill.total - bill.paid)}
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
                  <TD className="num text-right font-semibold">{formatIDR(line.amount)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>

        {payments.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Riwayat Pembayaran
            </p>
            <div className="space-y-1.5">
              {payments.map((payment: any) => (
                <div
                  key={payment._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="num font-semibold">{payment.number}</span>
                  <span className="text-muted-foreground">
                    {formatDate(payment.date)} • {payment.method}
                  </span>
                  <span className="num font-bold text-rose-600">{formatIDR(payment.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {entry ? (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5" /> Jurnal {entry.number}
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
