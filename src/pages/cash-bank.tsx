import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  FileText,
  Plus,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, Loading, PageHeader, Stat, Tabs } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { cn, downloadCSV, errorMessage, formatDate, formatIDR, todayISO } from "@/lib/utils";
import { useViewTarget } from "@/lib/view-target";

export default function CashBank() {
  const accounts = useQuery(api.accounts.cashBankAccounts);
  const transactions = useQuery(api.cash.listCashTransactions);
  const cashFlow = useQuery(api.reports.cashFlow, { from: monthStart(), to: todayISO() });
  const create = useMutation(api.cash.createCashTransaction);

  const [tab, setTab] = React.useState("transaksi");
  // Dipicu dari pop-up pemilihan dokumen di sidebar.
  useViewTarget((view) => {
    if (view === "form") openForm();
    else setTab("transaksi");
  });
  const [formOpen, setFormOpen] = React.useState(false);
  const [direction, setDirection] = React.useState<"in" | "out" | "transfer">("in");
  const [date, setDate] = React.useState(todayISO());
  const [amount, setAmount] = React.useState<number | "">("");
  const [accountId, setAccountId] = React.useState("");
  const [contraAccountId, setContraAccountId] = React.useState("");
  const [memo, setMemo] = React.useState("");
  const [pending, setPending] = React.useState(false);

  function monthStart() {
    return `${todayISO().slice(0, 7)}-01`;
  }

  const totalBalance = (accounts ?? []).reduce((sum: number, account: any) => {
    const row = cashFlow?.rows.find((r: any) => r._id === account._id);
    return sum + (row?.closing ?? 0);
  }, 0);

  const monthInflow = cashFlow?.totalInflow ?? 0;
  const monthOutflow = cashFlow?.totalOutflow ?? 0;

  const openForm = (preset?: "in" | "out" | "transfer") => {
    setDirection(preset ?? "in");
    setDate(todayISO());
    setAmount("");
    setAccountId(accounts?.[0]?._id ?? "");
    setContraAccountId("");
    setMemo("");
    setFormOpen(true);
  };

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Nominal harus lebih dari 0");
      return;
    }
    if (!accountId || !contraAccountId) {
      toast.error("Pilih akun kas/bank dan akun lawan");
      return;
    }
    setPending(true);
    try {
      const result = await create({
        date,
        direction,
        amount: Number(amount),
        accountId: accountId as Id<"accounts">,
        contraAccountId: contraAccountId as Id<"accounts">,
        memo: memo || (direction === "in" ? "Penerimaan kas" : direction === "out" ? "Pengeluaran kas" : "Transfer antar rekening"),
      });
      toast.success(`Transaksi ${result.number} terposting ke jurnal`);
      setFormOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [["No", "Tanggal", "Jenis", "Memo", "Nominal"]];
    for (const tx of transactions ?? []) {
      rows.push([tx.number, tx.date, tx.direction, tx.memo, tx.amount]);
    }
    downloadCSV("kas-bank.csv", rows);
  };

  if (accounts === undefined || transactions === undefined || cashFlow === undefined) {
    return <Loading label="Memuat kas & bank…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kas & Bank"
        description="Penerimaan, pengeluaran, dan transfer antar rekening — semua masuk jurnal."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <FileText className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="accent" size="sm" onClick={() => openForm()}>
              <Plus className="h-3.5 w-3.5" /> Transaksi Baru
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Saldo" value={formatIDR(totalBalance, { compact: true })} icon={<Wallet className="h-4 w-4" />} />
        <Stat
          label="Arus Masuk Bulan Ini"
          value={formatIDR(monthInflow, { compact: true })}
          tone="positive"
          icon={<ArrowDownLeft className="h-4 w-4" />}
        />
        <Stat
          label="Arus Keluar Bulan Ini"
          value={formatIDR(monthOutflow, { compact: true })}
          tone="negative"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
      </div>

      {/* ACCOUNT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(cashFlow?.rows ?? []).map((account: any) => (
          <Card key={account._id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl",
                    account.kind === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700",
                  )}
                >
                  {account.kind === "cash" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-bold leading-tight">{account.name}</p>
                  <p className="num text-xs text-muted-foreground">{account.code}</p>
                </div>
              </div>
              <Badge variant={account.kind === "cash" ? "success" : "info"}>
                {account.kind === "cash" ? "Kas" : "Bank"}
              </Badge>
            </div>
            <p className="num mt-4 text-2xl font-extrabold">{formatIDR(account.closing)}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg bg-secondary p-1.5">
                <p className="text-muted-foreground">Awal</p>
                <p className="num font-bold">{formatIDR(account.opening, { compact: true })}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-1.5">
                <p className="text-emerald-600">Masuk</p>
                <p className="num font-bold text-emerald-600">{formatIDR(account.inflow, { compact: true })}</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-1.5">
                <p className="text-rose-600">Keluar</p>
                <p className="num font-bold text-rose-600">{formatIDR(account.outflow, { compact: true })}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: "transaksi", label: "Riwayat Transaksi", count: transactions.length }]} />

      {transactions.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi kas/bank"
          description="Semua penerimaan pembayaran dan pembelian otomatis muncul di sini."
          icon={<Wallet className="h-8 w-8" />}
        />
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>No</TH>
                  <TH>Tanggal</TH>
                  <TH>Jenis</TH>
                  <TH>Keterangan</TH>
                  <TH className="text-right">Nominal</TH>
                </TR>
              </THead>
              <TBody>
                {transactions.map((tx: any) => (
                  <TR key={tx._id}>
                    <TD className="num font-semibold">{tx.number}</TD>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDate(tx.date)}</TD>
                    <TD>
                      <Badge
                        variant={
                          tx.direction === "in" ? "success" : tx.direction === "out" ? "danger" : "info"
                        }
                      >
                        {tx.direction === "in" ? "Masuk" : tx.direction === "out" ? "Keluar" : "Transfer"}
                      </Badge>
                    </TD>
                    <TD>{tx.memo}</TD>
                    <TD
                      className={cn(
                        "num text-right font-bold",
                        tx.direction === "in" ? "text-emerald-600" : tx.direction === "out" ? "text-rose-600" : "",
                      )}
                    >
                      {formatIDR(tx.amount)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}

      {/* FORM */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Transaksi Kas & Bank"
        description="Sistem memilih debit/kredit otomatis sesuai arah dana."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submit} disabled={pending}>
              {pending ? "Memposting…" : "Posting"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "in", label: "Masuk", icon: ArrowDownLeft },
                { id: "out", label: "Keluar", icon: ArrowUpRight },
                { id: "transfer", label: "Transfer", icon: ArrowRightLeft },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => setDirection(option.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-colors",
                  direction === option.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                <option.icon className="h-5 w-5" />
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Nominal">
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => (e.target.value === "" ? setAmount("") : setAmount(Number(e.target.value)))}
                placeholder="0"
              />
            </Field>
          </div>

          <Field
            label={direction === "transfer" ? "Dari Akun" : "Akun Kas/Bank"}
            hint={direction === "out" ? "Akun yang dikredit (sumber dana keluar)" : undefined}
          >
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Pilih…</option>
              {(accounts ?? []).map((account: any) => (
                <option key={account._id} value={account._id}>
                  {account.code} • {account.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={direction === "transfer" ? "Ke Akun" : "Akun Lawan"}
            hint={direction === "in" ? "Misal pendapatan lain; untuk keluar: misal beban" : undefined}
          >
            <Select value={contraAccountId} onChange={(e) => setContraAccountId(e.target.value)}>
              <option value="">Pilih…</option>
              {(accounts ?? [])
                .filter((account: any) => account._id !== accountId)
                .map((account: any) => (
                  <option key={account._id} value={account._id}>
                    {account.code} • {account.name}
                  </option>
                ))}
            </Select>
          </Field>

          <Field label="Keterangan">
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Deskripsi transaksi…" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
