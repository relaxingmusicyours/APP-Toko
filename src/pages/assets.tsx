import { useMutation, useQuery } from "convex/react";
import {
  Building2,
  CalendarClock,
  History,
  Plus,
  Receipt,
  TrendingDown,
  Trash2,
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
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Loading, PageHeader, Stat, Tabs } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { cn, currentMonthISO, downloadCSV, errorMessage, formatDate, formatIDR, todayISO } from "@/lib/utils";

export default function Assets() {
  const assets = useQuery(api.assets.listAssets);
  const accounts = useQuery(api.accounts.cashBankAccounts);
  const allAccounts = useQuery(api.accounts.list);
  const history = useQuery(api.assets.depreciationHistory, {});
  const acquire = useMutation(api.assets.acquire);
  const runDepreciation = useMutation(api.assets.runDepreciation);
  const dispose = useMutation(api.assets.dispose);

  const [tab, setTab] = React.useState("daftar");
  const [acquireOpen, setAcquireOpen] = React.useState(false);
  const [depOpen, setDepOpen] = React.useState(false);
  const [disposeTarget, setDisposeTarget] = React.useState<any>(null);
  const [pending, setPending] = React.useState(false);

  // acquire form
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [acqDate, setAcqDate] = React.useState(todayISO());
  const [cost, setCost] = React.useState<number | "">("");
  const [salvage, setSalvage] = React.useState<number | "">(0);
  const [usefulLife, setUsefulLife] = React.useState<number | "">(48);
  const [method, setMethod] = React.useState<"straight_line" | "declining_balance">("straight_line");
  const [location, setLocation] = React.useState("");
  const [fundAccountId, setFundAccountId] = React.useState("");

  // depreciation form
  const [depMonth, setDepMonth] = React.useState(currentMonthISO());

  // dispose form
  const [disposeDate, setDisposeDate] = React.useState(todayISO());
  const [proceeds, setProceeds] = React.useState<number | "">("");
  const [disposeAccountId, setDisposeAccountId] = React.useState("");
  const [disposeReason, setDisposeReason] = React.useState("");

  React.useEffect(() => {
    if (accounts?.length && !fundAccountId) setFundAccountId(accounts[0]._id);
  }, [accounts, fundAccountId]);

  React.useEffect(() => {
    if (accounts?.length && !disposeAccountId) setDisposeAccountId(accounts[0]._id);
  }, [accounts, disposeAccountId]);

  const active = (assets ?? []).filter((a: any) => a.status === "active");
  const totals = (assets ?? []).reduce(
    (acc: { cost: number; accum: number; book: number; next: number }, a: any) => {
      acc.cost += a.cost;
      acc.accum += a.accumulatedDepreciation;
      acc.book += a.bookValue;
      if (a.status === "active") acc.next += a.nextDepreciation;
      return acc;
    },
    { cost: 0, accum: 0, book: 0, next: 0 },
  );

  const openAcquire = () => {
    setName("");
    setCategory("");
    setAcqDate(todayISO());
    setCost("");
    setSalvage(0);
    setUsefulLife(48);
    setMethod("straight_line");
    setLocation("");
    setAcquireOpen(true);
  };

  const submitAcquire = async () => {
    setPending(true);
    try {
      const result = await acquire({
        name,
        category: category || undefined,
        acquisitionDate: acqDate,
        cost: Number(cost) || 0,
        salvageValue: Number(salvage) || 0,
        usefulLifeMonths: Number(usefulLife) || 0,
        method,
        location: location || undefined,
        fundAccountId: fundAccountId as Id<"accounts">,
      });
      toast.success(`Aset ${result.code} tercatat dan di jurnalkan`);
      setAcquireOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const submitDepreciation = async () => {
    setPending(true);
    try {
      const result = await runDepreciation({ month: depMonth });
      if (result.processed.length === 0) {
        toast.info("Tidak ada aset yang perlu disusutkan pada bulan ini");
      } else {
        toast.success(
          `Penyusutan ${result.month}: ${result.processed.length} aset totaling ${formatIDR(result.total)}`,
        );
      }
      setDepOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const openDispose = (asset: any) => {
    setDisposeTarget(asset);
    setDisposeDate(todayISO());
    setProceeds(asset.bookValue);
    setDisposeReason("");
    setDisposeAccountId(accounts?.[0]?._id ?? "");
  };

  const submitDispose = async () => {
    if (!disposeTarget) return;
    setPending(true);
    try {
      const result = await dispose({
        assetId: disposeTarget._id,
        date: disposeDate,
        proceeds: Number(proceeds) || 0,
        toAccountId: disposeAccountId as Id<"accounts">,
        reason: disposeReason || undefined,
      });
      const label = result.result === "loss" ? "rugi" : result.result === "gain" ? "laba" : "impas";
      toast.success(`Aset ${result.code} dihapus — ${label} penjualan tercatat di jurnal`);
      setDisposeTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ["Kode", "Nama", "Kategori", "Tgl Perolehan", "Biaya", "Akumulasi", "Nilai Buku", "Status"],
    ];
    for (const a of assets ?? []) {
      rows.push([
        a.code,
        a.name,
        a.category ?? "",
        a.acquisitionDate,
        a.cost,
        a.accumulatedDepreciation,
        a.bookValue,
        a.status,
      ]);
    }
    downloadCSV("aset-tetap.csv", rows);
  };

  if (assets === undefined || allAccounts === undefined) {
    return <Loading label="Memuat aset tetap…" />;
  }

  const fundingAccounts = allAccounts.filter(
    (a: any) => a.kind === "cash" || a.kind === "bank" || a.kind === "payable",
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aset Tetap"
        description="Siklus aset tetap: perolehan, penyusutan terjadwal, sampai disposal dengan laba/rugi otomatis."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Receipt className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              variant="teal"
              size="sm"
              onClick={() => {
                setDepMonth(currentMonthISO());
                setDepOpen(true);
              }}
            >
              <CalendarClock className="h-3.5 w-3.5" /> Jalankan Penyusutan
            </Button>
            <Button variant="accent" size="sm" onClick={openAcquire}>
              <Plus className="h-3.5 w-3.5" /> Perolehan Aset
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Nilai Perolehan" value={formatIDR(totals.cost, { compact: true })} icon={<Building2 className="h-4 w-4" />} />
        <Stat
          label="Akumulasi Penyusutan"
          value={formatIDR(totals.accum, { compact: true })}
          tone="warning"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <Stat label="Nilai Buku" value={formatIDR(totals.book, { compact: true })} tone="positive" />
        <Stat
          label="Beban Penyusutan / Bulan"
          value={formatIDR(totals.next, { compact: true })}
          hint={`${active.length} aset aktif`}
          icon={<CalendarClock className="h-4 w-4" />}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "daftar", label: "Daftar Aset", count: assets.length },
          { value: "jadwal", label: "Jadwal Penyusutan", count: history?.length ?? 0 },
        ]}
      />

      {tab === "daftar" ? (
        assets.length === 0 ? (
          <EmptyState
            title="Belum ada aset tetap"
            description="Catat perolehan aset (mesin, kendaraan, peralatan) untuk mulai menghitung penyusutan."
            icon={<Building2 className="h-8 w-8" />}
            action={
              <Button variant="accent" onClick={openAcquire}>
                <Plus className="h-4 w-4" /> Perolehan Aset Pertama
              </Button>
            }
          />
        ) : (
          <Card>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Aset</TH>
                    <TH>Perolehan</TH>
                    <TH className="text-right">Biaya</TH>
                    <TH className="text-right">Akumulasi</TH>
                    <TH className="text-right">Nilai Buku</TH>
                    <TH className="text-right">Susut/Bulan</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {assets.map((asset: any) => (
                    <TR key={asset._id}>
                      <TD>
                        <p className="font-semibold">{asset.name}</p>
                        <p className="num text-xs text-muted-foreground">
                          {asset.code} • {asset.category ?? "Tanpa kategori"} • {asset.methodLabel}
                        </p>
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground">
                        <p>{formatDate(asset.acquisitionDate)}</p>
                        <p className="text-xs">{asset.usefulLifeMonths} bulan</p>
                      </TD>
                      <TD className="num text-right">{formatIDR(asset.cost)}</TD>
                      <TD className="num text-right text-amber-600">
                        {formatIDR(asset.accumulatedDepreciation)}
                      </TD>
                      <TD className="num text-right font-bold">{formatIDR(asset.bookValue)}</TD>
                      <TD className="num text-right text-muted-foreground">
                        {asset.status === "active" ? formatIDR(asset.nextDepreciation) : "-"}
                      </TD>
                      <TD>
                        {asset.status === "active" ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Dihapus</Badge>
                        )}
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          {asset.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDisposeTarget(asset);
                                setDisposeDate(todayISO());
                                setProceeds(asset.bookValue);
                                setDisposeReason("");
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Jual
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
        )
      ) : (
        <Card>
          <div className="flex items-center gap-2 border-b border-border p-4">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="font-bold">Riwayat Penyusutan &amp; Disposal</p>
          </div>
          {(history ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Belum ada jurnal penyusutan. Klik "Jalankan Penyusutan" untuk memposting bulan berjalan.
            </p>
          ) : (
            <TableWrap className="max-h-[520px]">
              <Table>
                <THead>
                  <TR>
                    <TH>Jurnal</TH>
                    <TH>Tanggal</TH>
                    <TH>Keterangan</TH>
                    <TH className="text-right">Nilai</TH>
                  </TR>
                </THead>
                <TBody>
                  {(history ?? []).map((entry: any) => (
                    <TR key={entry._id}>
                      <TD>
                        <Badge variant={entry.sourceType === "DEPRECIATION" ? "info" : "warning"}>
                          {entry.sourceType === "DEPRECIATION" ? "Penyusutan" : "Disposal"}
                        </Badge>
                        <span className="num ml-2 text-xs text-muted-foreground">{entry.number}</span>
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{entry.date}</TD>
                      <TD className="max-w-[320px] truncate">{entry.memo}</TD>
                      <TD className="num text-right font-semibold">{formatIDR(entry.totalDebit)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>
      )}

      {/* ACQUIRE DIALOG */}
      <Dialog
        open={acquireOpen}
        onClose={() => setAcquireOpen(false)}
        title="Perolehan Aset Tetap"
        description="Terposting otomatis: Debit Aset Tetap, Kredit Kas/Bank/Utang."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAcquireOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitAcquire} disabled={pending || !name.trim()}>
              {pending ? "Memposting…" : "Simpan & Jurnalkan"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama Aset">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mesin penggiling"
              />
            </Field>
            <Field label="Kategori">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Mesin / Kendaraan / Peralatan"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tanggal Perolehan">
              <Input type="date" value={acqDate} onChange={(e) => setAcqDate(e.target.value)} />
            </Field>
            <Field label="Nilai Perolehan">
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => (e.target.value === "" ? setCost("") : setCost(Number(e.target.value)))}
              />
            </Field>
            <Field label="Nilai Sisa (residu)">
              <Input
                type="number"
                min={0}
                value={salvage}
                onChange={(e) => setSalvage(Number(e.target.value) || 0)}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Masa Manfaat (bulan)">
              <Input
                type="number"
                min={1}
                value={usefulLife}
                onChange={(e) => setUsefulLife(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Metode">
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as "straight_line" | "declining_balance")}
              >
                <option value="straight_line">Garis Lurus</option>
                <option value="declining_balance">Saldo Menurun</option>
              </Select>
            </Field>
            <Field label="Lokasi">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Pabrik /Toko"
              />
            </Field>
          </div>
          <Field label="Sumber Dana" hint="Kas, Bank, atau Utang Usaha (kredit pembelian).">
            <Select value={fundAccountId} onChange={(e) => setFundAccountId(e.target.value)}>
              {fundingAccounts.map((account: any) => (
                <option key={account._id} value={account._id}>
                  {account.code} • {account.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      {/* DEPRECIATION DIALOG */}
      <Dialog
        open={depOpen}
        onClose={() => setDepOpen(false)}
        title="Jalankan Penyusutan Bulanan"
        description="Satu jurnal per aset, idempotent per bulan (tidak bisa dobel)."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDepOpen(false)}>
              Batal
            </Button>
            <Button variant="teal" onClick={submitDepreciation} disabled={pending}>
              {pending ? "Memposting…" : "Posting Penyusutan"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Periode Bulan">
            <Input type="month" value={depMonth} onChange={(e) => setDepMonth(e.target.value)} />
          </Field>
          <div className="space-y-1.5">
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada aset aktif.</p>
            ) : (
              active.map((asset: any) => (
                <div
                  key={asset._id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="num text-xs text-muted-foreground">
                      mulai {asset.depreciationStartMonth} • {asset.methodLabel}
                    </p>
                  </div>
                  <span className="num font-semibold">{formatIDR(asset.nextDepreciation)}</span>
                </div>
              ))
            )}
            <div className="flex items-center justify-between rounded-lg bg-navy-950 px-3 py-2.5 text-white">
              <span className="text-sm font-semibold">Total Bulan Ini</span>
              <span className="num font-extrabold text-gg-lime">
                {formatIDR(totals.next)}
              </span>
            </div>
          </div>
        </div>
      </Dialog>

      {/* DISPOSE DIALOG */}
      <Dialog
        open={!!disposeTarget}
        onClose={() => setDisposeTarget(null)}
        title={`Penjualan Aset ${disposeTarget?.code ?? ""}`}
        description="Akumulasi penyusutan dihapus, laba/rugi dihitung otomatis dari nilai buku."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDisposeTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={submitDispose} disabled={pending}>
              {pending ? "Memposting…" : "Posting Penjualan Aset"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-secondary p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nilai buku saat ini</span>
              <span className="num font-bold">{formatIDR(disposeTarget?.bookValue ?? 0)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Akumulasi penyusutan</span>
              <span className="num">{formatIDR(disposeTarget?.accumulatedDepreciation ?? 0)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Penjualan">
              <Input
                type="date"
                value={disposeDate}
                onChange={(e) => setDisposeDate(e.target.value)}
              />
            </Field>
            <Field label="Harga Jual">
              <Input
                type="number"
                min={0}
                value={proceeds}
                onChange={(e) => (e.target.value === "" ? setProceeds("") : setProceeds(Number(e.target.value)))}
              />
            </Field>
          </div>
          <Field label="Tujuan Hasil Jual">
            <Select value={disposeAccountId} onChange={(e) => setDisposeAccountId(e.target.value)}>
              {(accounts ?? []).map((account: any) => (
                <option key={account._id} value={account._id}>
                  {account.code} • {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alasan">
            <Textarea
              value={disposeReason}
              onChange={(e) => setDisposeReason(e.target.value)}
              placeholder="Rusak / ganti baru"
            />
          </Field>
          {disposeTarget ? (
            <div
              className={cn(
                "rounded-xl p-3 text-sm font-semibold",
                (Number(proceeds) || 0) >= disposeTarget.bookValue
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700",
              )}
            >
              <Wallet className="mr-2 inline h-4 w-4" />
              {(Number(proceeds) || 0) >= disposeTarget.bookValue
                ? `Laba penjualan ${formatIDR((Number(proceeds) || 0) - disposeTarget.bookValue)}`
                : `Rugi penjualan ${formatIDR(disposeTarget.bookValue - (Number(proceeds) || 0))}`}
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
