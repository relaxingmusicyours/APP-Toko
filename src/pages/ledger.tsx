import { useMutation, useQuery } from "convex/react";
import {
  BookOpenCheck,
  FileText,
  Plus,
  Scale,
  ScrollText,
  Trash2,
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
import { EmptyState, Loading, PageHeader, Tabs } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { cn, downloadCSV, errorMessage, formatIDR, todayISO } from "@/lib/utils";
import { useViewTarget } from "@/lib/view-target";

interface LineDraft {
  accountId: string;
  debit: number;
  credit: number;
}

const TYPE_LABEL: Record<string, string> = {
  asset: "Aset",
  liability: "Liabilitas",
  equity: "Ekuitas",
  revenue: "Pendapatan",
  expense: "Beban",
};

export default function Ledger() {
  const accounts = useQuery(api.accounts.list);
  const entries = useQuery(api.journals.listEntries);
  const createManual = useMutation(api.journals.createManual);

  const [tab, setTab] = React.useState("jurnal");
  // Dipicu dari pop-up pemilihan dokumen di sidebar.
  useViewTarget((view) => {
    if (view === "form") openForm();
    else if (view === "jurnal" || view === "coa" || view === "buku") setTab(view);
  });
  const [ledgerAccountId, setLedgerAccountId] = React.useState<Id<"accounts"> | "">("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [date, setDate] = React.useState(todayISO());
  const [memo, setMemo] = React.useState("");
  const [lines, setLines] = React.useState<LineDraft[]>([
    { accountId: "", debit: 0, credit: 0 },
    { accountId: "", debit: 0, credit: 0 },
  ]);
  const [pending, setPending] = React.useState(false);

  const totalDebit = lines.reduce((s, line) => s + (line.debit || 0), 0);
  const totalCredit = lines.reduce((s, line) => s + (line.credit || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  const setLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { accountId: "", debit: 0, credit: 0 }]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));

  const openForm = () => {
    setDate(todayISO());
    setMemo("");
    setLines([
      { accountId: "", debit: 0, credit: 0 },
      { accountId: "", debit: 0, credit: 0 },
    ]);
    setFormOpen(true);
  };

  const submit = async () => {
    const valid = lines.filter((line) => line.accountId && (line.debit > 0 || line.credit > 0));
    if (!memo.trim()) {
      toast.error("Keterangan wajib diisi");
      return;
    }
    if (valid.length < 2) {
      toast.error("Minimal dua baris akun (debit & kredit)");
      return;
    }
    if (totalDebit !== totalCredit) {
      toast.error(`Tidak seimbang: debit ${formatIDR(totalDebit)} ≠ kredit ${formatIDR(totalCredit)}`);
      return;
    }
    setPending(true);
    try {
      const result = await createManual({
        date,
        memo: memo.trim(),
        lines: valid.map((line) => ({
          accountId: line.accountId as Id<"accounts">,
          debit: line.debit || 0,
          credit: line.credit || 0,
        })),
      });
      toast.success(`Jurnal ${result.number} terposting — seimbang ${formatIDR(result.totalDebit)}`);
      setFormOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const exportEntries = () => {
    const rows: Array<Array<string | number>> = [["Jurnal", "Tanggal", "Keterangan", "Akun", "Debit", "Kredit"]];
    for (const entry of entries ?? []) {
      for (const line of entry.lines) {
        rows.push([
          entry.number,
          entry.date,
          entry.memo,
          `${line.accountCode} ${line.accountName}`,
          line.debit,
          line.credit,
        ]);
      }
    }
    downloadCSV("jurnal-umum.csv", rows);
  };

  if (accounts === undefined || entries === undefined) {
    return <Loading label="Memuat buku besar…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buku Besar"
        description="Chart of accounts, jurnal umum, dan drill-down saldo per akun."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportEntries}>
              <FileText className="h-3.5 w-3.5" /> Export Jurnal
            </Button>
            <Button variant="accent" size="sm" onClick={openForm}>
              <Plus className="h-3.5 w-3.5" /> Jurnal Manual
            </Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "jurnal", label: "Jurnal Umum", count: entries.length },
          { value: "coa", label: "Chart of Accounts", count: accounts.length },
          { value: "buku", label: "Buku per Akun" },
        ]}
      />

      {tab === "jurnal" ? (
        entries.length === 0 ? (
          <EmptyState title="Belum ada jurnal" icon={<ScrollText className="h-8 w-8" />} />
        ) : (
          <div className="space-y-3">
            {entries.map((entry: any) => (
              <Card key={entry._id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{entry.number}</Badge>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                    <span className="text-sm font-semibold">{entry.memo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{entry.sourceType}</Badge>
                    <span className="num text-xs font-bold text-muted-foreground">
                      D {formatIDR(entry.totalDebit)} = K {formatIDR(entry.totalCredit)}
                    </span>
                  </div>
                </div>
                <TableWrap>
                  <Table>
                    <TBody>
                      {entry.lines.map((line: any) => (
                        <TR key={line._id}>
                          <TD className="w-40">
                            <span className="num text-xs text-muted-foreground">{line.accountCode}</span>
                          </TD>
                          <TD className="font-medium">{line.accountName}</TD>
                          <TD className="num text-right">{line.debit ? formatIDR(line.debit) : "—"}</TD>
                          <TD className="num text-right">{line.credit ? formatIDR(line.credit) : "—"}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "coa" ? (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Kode</TH>
                  <TH>Nama Akun</TH>
                  <TH>Tipe</TH>
                  <TH>Peran Sistem</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {accounts.map((account: any) => (
                  <TR key={account._id}>
                    <TD className="num font-semibold">{account.code}</TD>
                    <TD className="font-medium">{account.name}</TD>
                    <TD>
                      <Badge variant="outline">{TYPE_LABEL[account.type] ?? account.type}</Badge>
                    </TD>
                    <TD className="num text-xs text-muted-foreground">{account.kind}</TD>
                    <TD>
                      {account.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}

      {tab === "buku" ? (
        <div className="space-y-4">
          <Card className="p-3">
            <Select
              value={ledgerAccountId}
              onChange={(e) => setLedgerAccountId(e.target.value as Id<"accounts">)}
              className="max-w-md"
            >
              <option value="">Pilih akun untuk melihat buku besar…</option>
              {accounts.map((account: any) => (
                <option key={account._id} value={account._id}>
                  {account.code} • {account.name} ({TYPE_LABEL[account.type]})
                </option>
              ))}
            </Select>
          </Card>
          {ledgerAccountId ? (
            <LedgerView accountId={ledgerAccountId} />
          ) : (
            <EmptyState
              title="Pilih akun"
              description="Buku besar menampilkan setiap baris jurnal akun dengan saldo berjalan."
              icon={<BookOpenCheck className="h-8 w-8" />}
            />
          )}
        </div>
      ) : null}

      {/* MANUAL JOURNAL */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Jurnal Umum Manual"
        description="Sistem menolak posting jika debit ≠ kredit."
        size="lg"
        footer={
          <>
            <div
              className={cn(
                "mr-auto flex items-center gap-2 text-sm font-semibold",
                balanced ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              <Scale className="h-4 w-4" />
              D {formatIDR(totalDebit)} • K {formatIDR(totalCredit)}{" "}
              {totalDebit !== totalCredit ? "(belum seimbang)" : ""}
            </div>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submit} disabled={pending || !balanced}>
              {pending ? "Memposting…" : "Posting Jurnal"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Keterangan">
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Deskripsi transaksi…" />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_120px_120px_36px] gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Akun</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Kredit</span>
              <span />
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px_120px_36px] items-center gap-2">
                <Select
                  value={line.accountId}
                  onChange={(e) => setLine(index, { accountId: e.target.value })}
                  className="h-9"
                >
                  <option value="">Pilih akun…</option>
                  {accounts.map((account: any) => (
                    <option key={account._id} value={account._id}>
                      {account.code} • {account.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={line.debit || ""}
                  onChange={(e) => setLine(index, { debit: Number(e.target.value) || 0, credit: 0 })}
                  className="h-9 text-right"
                  placeholder="0"
                />
                <Input
                  type="number"
                  min={0}
                  value={line.credit || ""}
                  onChange={(e) => setLine(index, { credit: Number(e.target.value) || 0, debit: 0 })}
                  className="h-9 text-right"
                  placeholder="0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(index)}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="subtle" size="sm" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" /> Tambah Baris
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function LedgerView({ accountId }: { accountId: Id<"accounts"> }) {
  const accounts = useQuery(api.accounts.list);
  const account = (accounts ?? []).find((a: any) => a._id === accountId);
  const normalBalance = account && (account.type === "asset" || account.type === "expense") ? "debit" : "credit";
  const ledger = useQuery(api.journals.accountLedger, {
    accountId,
    normalBalance: normalBalance as "debit" | "credit",
  });

  if (!ledger || !account) return <Loading />;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <p className="font-bold">
            <span className="num text-muted-foreground">{account.code}</span> {account.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Saldo normal {normalBalance === "debit" ? "debit" : "kredit"}
          </p>
        </div>
        <div className="num text-right text-sm">
          <p className="text-muted-foreground">
            Saldo awal: <span className="font-bold text-foreground">{formatIDR(ledger.opening)}</span>
          </p>
          <p>
            Saldo akhir: <span className="font-bold">{formatIDR(ledger.closing)}</span>
          </p>
        </div>
      </div>
      <TableWrap className="max-h-[480px]">
        <Table>
          <THead>
            <TR>
              <TH>Tanggal</TH>
              <TH>Jurnal</TH>
              <TH>Keterangan</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Kredit</TH>
              <TH className="text-right">Saldo</TH>
            </TR>
          </THead>
          <TBody>
            {ledger.rows.map((row: any, index: number) => (
              <TR key={index}>
                <TD className="whitespace-nowrap text-muted-foreground">{row.date}</TD>
                <TD className="num text-xs font-semibold">{row.entryNumber}</TD>
                <TD className="max-w-[280px] truncate">{row.memo}</TD>
                <TD className="num text-right">{row.debit ? formatIDR(row.debit) : "—"}</TD>
                <TD className="num text-right">{row.credit ? formatIDR(row.credit) : "—"}</TD>
                <TD className="num text-right font-semibold">{formatIDR(row.balance)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </Card>
  );
}
