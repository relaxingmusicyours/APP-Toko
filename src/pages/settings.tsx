import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  History,
  ListChecks,
  Plus,
  ScrollText,
  ShieldCheck,
  Sparkles,
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
import { Loading, PageHeader, Stat, Tabs } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { errorMessage, formatDateTime } from "@/lib/utils";

type Tab = "perusahaan" | "akun" | "audit" | "roadmap" | "backlog";

const TYPE_OPTIONS = [
  { value: "asset", label: "Aset" },
  { value: "liability", label: "Liabilitas" },
  { value: "equity", label: "Ekuitas" },
  { value: "revenue", label: "Pendapatan" },
  { value: "expense", label: "Beban" },
];

const ROADMAP = [
  {
    phase: "MVP (Sekarang)",
    color: "lime" as const,
    items: [
      "Tenant, auth, COA otomatis, master data",
      "Kasir POS, penjualan, pembelian, retur",
      "Persediaan multi-gudang + opname",
      "Aset tetap & penyusutan otomatis",
      "Buku besar, kas & bank, laporan inti",
      "Audit trail",
    ],
  },
  {
    phase: "V2",
    color: "info" as const,
    items: [
      "Approval workflow & peran (RBAC)",
      "Quotation/SO/DO dan PO penuh",
      "Rekonsiliasi bank (import statement)",
      "Multi cabang & proyek",
    ],
  },
  {
    phase: "V3 / Enterprise",
    color: "warning" as const,
    items: [
      "Manufaktur: BOM, work order, variance",
      "e-Faktur / Smartlink Tax connector",
      "Integrasi marketplace, payment gateway, API publik",
      "SSO, data warehouse, workflow builder",
    ],
  },
];

type Priority = "P0" | "P1" | "P2";
type QaStatus = "passed" | "manual" | "gap";

const PRIORITY_VARIANT: Record<Priority, "danger" | "warning" | "info"> = {
  P0: "danger",
  P1: "warning",
  P2: "info",
};

const QA_STATUS: Record<QaStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  passed: { label: "Lulus", variant: "success" },
  manual: { label: "Uji manual", variant: "warning" },
  gap: { label: "Gap → P0", variant: "danger" },
};

/** Backlog produk (§26): epic berprioritas P0–P2. */
const BACKLOG: Array<{
  priority: Priority;
  title: string;
  desc: string;
  items: Array<{ label: string; done: boolean }>;
}> = [
  {
    priority: "P0",
    title: "Fondasi go-live",
    desc: "Wajib stabil sebelum dipakai bisnis nyata.",
    items: [
      { label: "Engine double-entry + audit trail", done: true },
      { label: "Kasir POS, penjualan, pembelian, retur", done: true },
      { label: "Persediaan multi-gudang + stok opname", done: true },
      { label: "Aset tetap: penyusutan & disposal", done: true },
      { label: "Laporan inti, aging, PPN, register aset", done: true },
      { label: "Unit test helper aging (7/7 lulus)", done: true },
      { label: "Validasi stok cukup di POS & penjualan (temuan TC-11)", done: false },
      { label: "RBAC dasar: pemilik / kasir / pembukuan", done: false },
      { label: "Lock periode (tutup buku)", done: false },
    ],
  },
  {
    priority: "P1",
    title: "Operasional lanjutan",
    desc: "Naikkan produktivitas harian pengguna.",
    items: [
      { label: "Approval workflow (void & diskon besar)", done: false },
      { label: "Quotation → SO → DO; PO penerimaan parsial", done: false },
      { label: "Rekonsiliasi bank (import mutasi)", done: false },
      { label: "Cetak struk thermal 58mm & faktur ber-KOP", done: false },
      { label: "Scanner barcode & multi-harga (retail/grosir)", done: false },
      { label: "Perbandingan periode & anggaran di laporan", done: false },
    ],
  },
  {
    priority: "P2",
    title: "Ekspansi & integrasi",
    desc: "Setelah ledger & operasional matang.",
    items: [
      { label: "e-Faktur / Smartlink Tax connector", done: false },
      { label: "Integrasi marketplace & payment gateway", done: false },
      { label: "Manufaktur: BOM, work order, variance", done: false },
      { label: "Multi cabang & profit center proyek", done: false },
      { label: "API publik & webhook", done: false },
    ],
  },
];

/** Test case kritis (§27): status berdasarkan guard backend & unit test aging. */
const QA_CASES: Array<{
  id: string;
  module: string;
  scenario: string;
  expected: string;
  status: QaStatus;
}> = [
  { id: "TC-01", module: "Engine", scenario: "Jurnal debit ≠ kredit", expected: "Ditolak dengan pesan selisih", status: "passed" },
  { id: "TC-02", module: "Engine", scenario: "Baris jurnal < 2 atau nilai negatif", expected: "Ditolak sebelum tersimpan", status: "passed" },
  { id: "TC-03", module: "Penjualan", scenario: "Void faktur tanpa pembayaran", expected: "Jurnal reversal + stok kembali", status: "passed" },
  { id: "TC-04", module: "Penjualan", scenario: "Void faktur yang sudah dibayar", expected: "Ditolak — gunakan jurnal koreksi", status: "passed" },
  { id: "TC-05", module: "Penjualan", scenario: "Penerimaan melebihi sisa tagihan", expected: "Ditolak dengan nominal sisa", status: "passed" },
  { id: "TC-06", module: "Retur", scenario: "Qty retur melebihi sisa", expected: "Ditolak + info sisa per unit", status: "passed" },
  { id: "TC-07", module: "Retur", scenario: "Retur dengan restock", expected: "Stok masuk gudang + HPP dibalik", status: "passed" },
  { id: "TC-08", module: "Pembelian", scenario: "Faktur baru memutakhirkan HPP", expected: "Biaya rata-rata bergerak diperbarui", status: "passed" },
  { id: "TC-09", module: "Kasir POS", scenario: "Uang diterima kurang dari total", expected: "Ditolak", status: "passed" },
  { id: "TC-10", module: "Kasir POS", scenario: "Kembalian via metode non-tunai", expected: "Ditolak — hanya lewat Cash", status: "passed" },
  { id: "TC-11", module: "Kasir POS", scenario: "Penjualan melebihi stok tersedia", expected: "Saat ini diterima (stok minus) → perlu validasi", status: "gap" },
  { id: "TC-12", module: "Persediaan", scenario: "Opname dengan selisih", expected: "Jurnal Selisih Persediaan otomatis", status: "passed" },
  { id: "TC-13", module: "Persediaan", scenario: "Opname tanpa selisih / hitung negatif", expected: "Ditolak", status: "passed" },
  { id: "TC-14", module: "Aset Tetap", scenario: "Penyusutan ulang di bulan sama", expected: "Idempoten — bulan terproses dilewati", status: "passed" },
  { id: "TC-15", module: "Aset Tetap", scenario: "Disposal di atas / bawah nilai buku", expected: "Laba → Pendapatan Lain; Rugi → Rugi Jual Aset", status: "passed" },
  { id: "TC-16", module: "Kas & Bank", scenario: "Transfer ke rekening yang sama", expected: "Ditolak", status: "passed" },
  { id: "TC-17", module: "Laporan", scenario: "Aging 14/15/30/31, clamp negatif, pembayaran parsial", expected: "Bucket benar — unit test 7/7", status: "passed" },
  { id: "TC-18", module: "Laporan", scenario: "Neraca seimbang & PPN payable pada data riil", expected: "Verifikasi visual di halaman Laporan", status: "manual" },
  { id: "TC-19", module: "Multi-tenant", scenario: "Data perusahaan lain tidak bocor", expected: "Semua query difilter companyId", status: "passed" },
  { id: "TC-20", module: "UI", scenario: "Export CSV & cetak semua laporan", expected: "Uji manual per tab laporan", status: "manual" },
];

const OPEN_BACKLOG_COUNT = BACKLOG.reduce(
  (sum, epic) => sum + epic.items.filter((item) => !item.done).length,
  0,
);

export default function Settings() {
  const me = useQuery(api.company.me);
  const accounts = useQuery(api.accounts.list);
  const logs = useQuery(api.company.auditLogs);
  const updateCompany = useMutation(api.company.updateCompany);
  const createAccount = useMutation(api.accounts.create);
  const toggleActive = useMutation(api.accounts.toggleActive);

  const [tab, setTab] = React.useState<Tab>("perusahaan");
  const [qaChecked, setQaChecked] = React.useState<Record<string, boolean>>({});

  const p0Open =
    BACKLOG.find((epic) => epic.priority === "P0")?.items.filter((item) => !item.done).length ?? 0;
  const qaPassed = QA_CASES.filter((qa) => qa.status === "passed").length;
  const qaManual = QA_CASES.filter((qa) => qa.status === "manual").length;
  const qaGap = QA_CASES.filter((qa) => qa.status === "gap").length;
  const checkedCount = Object.values(qaChecked).filter(Boolean).length;

  const [name, setName] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [initialized, setInitialized] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const [accOpen, setAccOpen] = React.useState(false);
  const [accCode, setAccCode] = React.useState("");
  const [accName, setAccName] = React.useState("");
  const [accType, setAccType] = React.useState("expense");

  React.useEffect(() => {
    if (me?.company && !initialized) {
      setName(me.company.name);
      setTaxId(me.company.taxId ?? "");
      setAddress(me.company.address ?? "");
      setPhone(me.company.phone ?? "");
      setInitialized(true);
    }
  }, [me, initialized]);

  const submitCompany = async () => {
    setPending(true);
    try {
      await updateCompany({ name, taxId: taxId || undefined, address: address || undefined, phone: phone || undefined });
      toast.success("Profil perusahaan diperbarui");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const submitAccount = async () => {
    setPending(true);
    try {
      await createAccount({ code: accCode, name: accName, type: accType as any });
      toast.success("Akun baru ditambahkan");
      setAccOpen(false);
      setAccCode("");
      setAccName("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (me === undefined || accounts === undefined || logs === undefined) {
    return <Loading label="Memuat pengaturan…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan"
        description="Profil perusahaan, Chart of Accounts, audit trail, roadmap, backlog, dan checklist QA."
      />

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        tabs={[
          { value: "perusahaan", label: "Perusahaan" },
          { value: "akun", label: "Chart of Accounts", count: accounts.length },
          { value: "audit", label: "Audit Trail", count: logs.length },
          { value: "roadmap", label: "Roadmap" },
          { value: "backlog", label: "Backlog & QA", count: OPEN_BACKLOG_COUNT },
        ]}
      />

      {tab === "perusahaan" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center gap-2 border-b border-border p-4">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="font-bold">Profil Perusahaan</p>
            </div>
            <div className="space-y-3 p-4">
              <Field label="Nama Perusahaan">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="NPWP" hint="Opsional — untuk faktur pajak.">
                <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="00.000.000.0-000.000" />
              </Field>
              <Field label="Alamat">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <Field label="Telepon">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Button variant="accent" onClick={submitCompany} disabled={pending || !name.trim()}>
                Simpan Perubahan
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-border p-4">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <p className="font-bold">Sistem &amp; Keamanan</p>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <div>
                  <p className="font-semibold">Tenant terisolasi</p>
                  <p className="text-xs text-muted-foreground">Data perusahaan terpisah per akun.</p>
                </div>
                <Badge variant="success">Aktif</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <div>
                  <p className="font-semibold">Audit trail</p>
                  <p className="text-xs text-muted-foreground">Setiap posting &amp; perubahan terekam.</p>
                </div>
                <Badge variant="success">Aktif</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <div>
                  <p className="font-semibold">Double-entry engine</p>
                  <p className="text-xs text-muted-foreground">Debit = kredit dijamin pada setiap posting.</p>
                </div>
                <Badge variant="success">Aktif</Badge>
              </div>
              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="font-semibold">Masuk roadmap</p>
                <p className="text-xs text-muted-foreground">
                  Peran &amp; approval berjenjang (V2), e-Faktur &amp; integrasi bank (V3), SSO
                  (Enterprise).
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "akun" ? (
        <Card>
          <div className="flex items-center justify-between border-b border-border p-4">
            <p className="font-bold">Chart of Accounts</p>
            <Button variant="accent" size="sm" onClick={() => setAccOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Akun Baru
            </Button>
          </div>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Kode</TH>
                  <TH>Nama Akun</TH>
                  <TH>Tipe</TH>
                  <TH>Peran</TH>
                  <TH>Status</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {accounts.map((account: any) => (
                  <TR key={account._id}>
                    <TD className="num font-semibold">{account.code}</TD>
                    <TD className="font-medium">{account.name}</TD>
                    <TD>
                      <Badge variant="outline">
                        {TYPE_OPTIONS.find((option) => option.value === account.type)?.label}
                      </Badge>
                    </TD>
                    <TD className="num text-xs text-muted-foreground">{account.kind}</TD>
                    <TD>
                      {account.isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </TD>
                    <TD>
                      {!account.isSystem ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await toggleActive({ accountId: account._id as Id<"accounts"> });
                            } catch (error) {
                              toast.error(errorMessage(error));
                            }
                          }}
                        >
                          Nonaktifkan
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sistem</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}

      {tab === "audit" ? (
        <Card>
          <div className="flex items-center gap-2 border-b border-border p-4">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="font-bold">Audit Trail</p>
            <Badge variant="outline">{logs.length} aktivitas terakhir</Badge>
          </div>
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Belum ada aktivitas.</p>
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Waktu</TH>
                    <TH>Pengguna</TH>
                    <TH>Aksi</TH>
                    <TH>Objek</TH>
                    <TH>Detail</TH>
                  </TR>
                </THead>
                <TBody>
                  {logs.map((log: any) => (
                    <TR key={log._id}>
                      <TD className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TD>
                      <TD className="text-sm">{log.userName ?? "Sistem"}</TD>
                      <TD>
                        <Badge
                          variant={
                            log.action === "POST"
                              ? "success"
                              : log.action === "VOID"
                                ? "danger"
                                : log.action === "CREATE"
                                  ? "info"
                                  : "outline"
                          }
                        >
                          {log.action}
                        </Badge>
                      </TD>
                      <TD className="text-sm font-medium">{log.entity}</TD>
                      <TD className="max-w-[280px] truncate text-xs text-muted-foreground">
                        {log.entityNumber ? `${log.entityNumber} — ` : ""}
                        {log.detail ?? ""}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>
      ) : null}

      {tab === "roadmap" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {ROADMAP.map((phase) => (
            <Card key={phase.phase} className="p-5">
              <Badge variant={phase.color}>{phase.phase}</Badge>
              <ul className="mt-4 space-y-2 text-sm">
                {phase.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gg-teal" />
                    <span className="text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          <Card className="p-5 lg:col-span-3">
            <div className="flex items-start gap-3">
              <ScrollText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground">Prinsip pembangunan:</span> fondasi
                (master data → transaksi → engine akuntansi → pelaporan) dibangun lebih dulu; fitur
                berat seperti manufaktur, pajak terintegrasi, dan workflow builder ditambahkan
                sebagai domain terpisah setelah ledger stabil.
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "backlog" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="P0 tersisa"
              value={p0Open}
              hint="wajib sebelum go-live"
              tone={p0Open > 0 ? "warning" : "positive"}
            />
            <Stat
              label="QA lulus"
              value={`${qaPassed}/${QA_CASES.length}`}
              hint="terverifikasi engine & unit test"
              tone="positive"
            />
            <Stat label="Uji manual" value={qaManual} hint="cek visual di aplikasi" />
            <Stat
              label="Temuan terbuka"
              value={qaGap}
              hint="masuk backlog P0"
              tone={qaGap > 0 ? "negative" : "positive"}
            />
          </div>

          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold">Backlog produk (§26) — epic P0–P2</p>
            <Badge variant="outline">{OPEN_BACKLOG_COUNT} item terbuka</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {BACKLOG.map((epic) => {
              const done = epic.items.filter((item) => item.done).length;
              return (
                <Card key={epic.priority} className="p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant={PRIORITY_VARIANT[epic.priority]}>{epic.priority}</Badge>
                    <span className="num text-xs text-muted-foreground">
                      {done}/{epic.items.length} selesai
                    </span>
                  </div>
                  <p className="mt-2 font-bold">{epic.title}</p>
                  <p className="text-xs text-muted-foreground">{epic.desc}</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {epic.items.map((item) => (
                      <li key={item.label} className="flex items-start gap-2">
                        {item.done ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={item.done ? "text-muted-foreground" : "text-foreground/85"}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          {qaGap > 0 ? (
            <Card className="border-amber-300/60 bg-amber-50/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-bold">Temuan QA aktif</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">
                    <span className="num font-semibold text-foreground">TC-11</span> — penjualan di
                    POS belum memvalidasi ketersediaan stok: transaksi tetap diterima dan stok
                    bisa minus. Solusinya masuk backlog{" "}
                    <Badge variant="danger">P0</Badge> item “Validasi stok cukup di POS &amp;
                    penjualan”.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <p className="font-bold">Test Case Kritis (§27)</p>
                <Badge variant="outline">{QA_CASES.length} kasus</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="num font-semibold text-foreground">
                  {checkedCount}/{QA_CASES.length}
                </span>
                terverifikasi sesi ini
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gg-lime transition-all"
                    style={{ width: `${Math.round((checkedCount / QA_CASES.length) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH className="w-10" />
                    <TH>ID</TH>
                    <TH>Modul</TH>
                    <TH>Skenario</TH>
                    <TH>Hasil Diharapkan</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {QA_CASES.map((qa) => (
                    <TR
                      key={qa.id}
                      className={qa.status === "gap" ? "bg-rose-50/60 dark:bg-rose-400/10" : undefined}
                    >
                      <TD>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-gg-lime"
                          checked={!!qaChecked[qa.id]}
                          onChange={() => setQaChecked((prev) => ({ ...prev, [qa.id]: !prev[qa.id] }))}
                          aria-label={`Tandai ${qa.id} terverifikasi`}
                        />
                      </TD>
                      <TD className="num text-xs font-semibold">{qa.id}</TD>
                      <TD>
                        <Badge variant="outline">{qa.module}</Badge>
                      </TD>
                      <TD className="text-sm font-medium">{qa.scenario}</TD>
                      <TD className="text-sm text-muted-foreground">{qa.expected}</TD>
                      <TD>
                        <Badge variant={QA_STATUS[qa.status].variant}>
                          {QA_STATUS[qa.status].label}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Centang hanya tersimpan selama sesi halaman ini (data statis, tanpa backend) — pakai
              sebagai checklist saat uji manual. Status “Lulus” berdasarkan guard backend &amp;
              unit test aging; temuan otomatis masuk backlog P0.
            </p>
          </Card>
        </div>
      ) : null}

      {/* ACCOUNT DIALOG */}
      <Dialog
        open={accOpen}
        onClose={() => setAccOpen(false)}
        title="Akun Baru"
        description="Tambahkan akun pembantu sesuai kebutuhan bisnis Anda."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAccOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitAccount} disabled={pending || !accCode.trim() || !accName.trim()}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <Field label="Kode">
              <Input value={accCode} onChange={(e) => setAccCode(e.target.value)} placeholder="5-5600" />
            </Field>
            <Field label="Nama Akun">
              <Input value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Beban Transportasi" />
            </Field>
          </div>
          <Field label="Tipe Akun">
            <Select value={accType} onChange={(e) => setAccType(e.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
