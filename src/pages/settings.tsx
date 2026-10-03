import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Eraser,
  History,
  ListChecks,
  Plus,
  Printer,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  UserPlus,
  UsersRound,
  Wallet,
  Plug,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { GithubIntegration } from "@/components/github-status";
import { SettingsTools, type SettingsTile, type ToolId } from "@/components/settings-tools";
import { TutorialLauncher } from "@/components/tutorial";
import { Field, Input, Select } from "@/components/ui/field";
import { Loading, PageHeader, Stat } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { errorMessage, formatDateTime } from "@/lib/utils";
import { useViewTarget } from "@/lib/view-target";

type Tab = "perusahaan" | "akun" | "audit" | "roadmap" | "backlog" | "integrasi" | ToolId;

const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "31/12/2026" },
  { value: "yyyy-MM-dd", label: "2026-12-31" },
  { value: "MM/dd/yyyy", label: "12/31/2026" },
];

const CURRENCIES = [
  { value: "IDR", label: "IDR — Rupiah Indonesia" },
  { value: "USD", label: "USD — Dolar Amerika" },
  { value: "SGD", label: "SGD — Dolar Singapura" },
  { value: "MYR", label: "MYR — Ringgit Malaysia" },
];

const RECEIPT_SIZES = [
  { value: "58mm", label: "58 mm — thermal kasir" },
  { value: "80mm", label: "80 mm — thermal standar" },
];



const MEMBER_ROLES = [
  { value: "manager", label: "Manajer" },
  { value: "cashier", label: "Kasir" },
  { value: "accountant", label: "Pembukuan" },
] as const;

/** Contoh tanggal hari ini mengikuti format yang dipilih. */
function sampleDate(format: string): string {
  const iso = new Date().toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (format === "yyyy-MM-dd") return iso;
  if (format === "MM/dd/yyyy") return `${month}/${day}/${year}`;
  return `${day}/${month}/${year}`;
}

/** Sakelar ringkas untuk preferensi boolean. */
function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={
        "flex w-full items-center justify-between gap-3 rounded-lg border border-border p-3 text-left transition-colors " +
        "hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
          (checked ? "bg-gg-teal" : "bg-secondary")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
            (checked ? "left-[22px]" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}

/** Ringkasan hak akses tiap peran — dipakai kartu Akses Grup. */
const ROLE_PERMISSIONS: Array<{
  role: string;
  label: string;
  desc: string;
  perms: string[];
}> = [
  {
    role: "owner",
    label: "Pemilik",
    desc: "Akses penuh, termasuk kelola anggota tim dan kosongkan database.",
    perms: ["Semua modul", "Ubah profil & COA", "Kelola pengguna", "Kosongkan database"],
  },
  {
    role: "manager",
    label: "Manajer",
    desc: "Operasional harian tanpa menghapus database.",
    perms: ["Kasir & penjualan", "Pembelian & persediaan", "Laporan", "Ubah profil"],
  },
  {
    role: "cashier",
    label: "Kasir",
    desc: "Fokus transaksi di kasir dan penerimaan pembayaran.",
    perms: ["Kasir POS", "Terima pembayaran", "Lihat pelanggan"],
  },
  {
    role: "accountant",
    label: "Pembukuan",
    desc: "Fokus jurnal, kas bank, dan laporan.",
    perms: ["Buku besar & jurnal", "Kas & bank", "Laporan", "Kartu stok"],
  },
];

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
  const prefs = useQuery(api.preferences.preferences);
  const members = useQuery(api.preferences.members);
  const accessSummary = useQuery(api.preferences.accessSummary);
  const updateCompany = useMutation(api.company.updateCompany);
  const createAccount = useMutation(api.accounts.create);
  const toggleActive = useMutation(api.accounts.toggleActive);
  const savePreferences = useMutation(api.preferences.savePreferences);
  const inviteMember = useMutation(api.preferences.inviteMember);
  const removeMember = useMutation(api.preferences.removeMember);
  const toggleMember = useMutation(api.preferences.toggleMember);

  const [tab, setTab] = React.useState<Tab>("perusahaan");
  // Dipicu dari pop-up pemilihan dokumen di sidebar.
  useViewTarget((view) => {
    if (view) setTab(view as Tab);
  });
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
  const [wipeOpen, setWipeOpen] = React.useState(false);
  const clearWorkspace = useMutation(api.company.clearWorkspace);

  // Preferensi & desain cetakan
  const [fiscalYear, setFiscalYear] = React.useState("");
  const [dateFormat, setDateFormat] = React.useState("dd/MM/yyyy");
  const [currency, setCurrency] = React.useState("IDR");
  const [defaultTaxRate, setDefaultTaxRate] = React.useState<number | "">(11);
  const [lowStockAlert, setLowStockAlert] = React.useState(true);
  const [receiptSize, setReceiptSize] = React.useState("80mm");
  const [receiptFooter, setReceiptFooter] = React.useState("");
  const [showReceiptLogo, setShowReceiptLogo] = React.useState(true);
  const [showTaxDetail, setShowTaxDetail] = React.useState(true);
  const [prefsReady, setPrefsReady] = React.useState(false);

  // Pengguna
  const [memberOpen, setMemberOpen] = React.useState(false);
  const [memberName, setMemberName] = React.useState("");
  const [memberEmail, setMemberEmail] = React.useState("");
  const [memberRole, setMemberRole] = React.useState("cashier");

  React.useEffect(() => {
    if (prefs && !prefsReady) {
      setFiscalYear(prefs.fiscalYear);
      setDateFormat(prefs.dateFormat);
      setCurrency(prefs.currency);
      setDefaultTaxRate(prefs.defaultTaxRate);
      setLowStockAlert(prefs.lowStockAlert);
      setReceiptSize(prefs.receiptSize);
      setReceiptFooter(prefs.receiptFooter);
      setShowReceiptLogo(prefs.showReceiptLogo);
      setShowTaxDetail(prefs.showTaxDetail);
      setPrefsReady(true);
    }
  }, [prefs, prefsReady]);

  const submitPreferences = async () => {
    setPending(true);
    try {
      await savePreferences({
        fiscalYear,
        dateFormat,
        currency,
        defaultTaxRate: Number(defaultTaxRate) || 0,
        lowStockAlert,
      });
      toast.success("Preferensi disimpan");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const submitPrintDesign = async () => {
    setPending(true);
    try {
      await savePreferences({
        receiptSize,
        receiptFooter: receiptFooter || undefined,
        showReceiptLogo,
        showTaxDetail,
      });
      toast.success("Desain cetakan disimpan");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const submitInvite = async () => {
    setPending(true);
    try {
      await inviteMember({
        name: memberName,
        email: memberEmail,
        role: memberRole as "manager" | "cashier" | "accountant",
      });
      toast.success("Anggota tim ditambahkan");
      setMemberOpen(false);
      setMemberName("");
      setMemberEmail("");
      setMemberRole("cashier");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const runMemberAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const toggleMemberStatus = (memberId: Id<"companyMembers">, name: string, active: boolean) =>
    runMemberAction(
      () => toggleMember({ memberId }),
      active ? `${name} dinonaktifkan` : `${name} diaktifkan`,
    );

  const deleteMember = (memberId: Id<"companyMembers">, name: string) =>
    runMemberAction(() => removeMember({ memberId }), `${name} dihapus dari daftar`);

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

  const submitWipe = async () => {
    setPending(true);
    try {
      await clearWorkspace({});
      toast.success("Database dikosongkan — COA dan gudang tetap tersedia");
      setWipeOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (me === undefined || accounts === undefined || logs === undefined) {
    return <Loading label="Memuat pengaturan…" />;
  }

  const sectionTiles: SettingsTile[] = [
    {
      id: "perusahaan",
      label: "Perusahaan",
      icon: Building2,
      hint: "Profil, keamanan, kosongkan database",
    },
    {
      id: "akun",
      label: "Chart of Accounts",
      icon: Wallet,
      hint: "Akun sistem & pembantu",
      count: accounts.length,
    },
    {
      id: "audit",
      label: "Audit Trail",
      icon: History,
      hint: "Jejak semua perubahan",
      count: logs.length,
    },
    {
      id: "roadmap",
      label: "Roadmap",
      icon: Sparkles,
      hint: "Rencana MVP → Enterprise",
    },
    {
      id: "backlog",
      label: "Backlog & QA",
      icon: ClipboardCheck,
      hint: "Epic P0–P2 & test case",
      count: OPEN_BACKLOG_COUNT,
    },
    {
      id: "integrasi",
      label: "Integrasi",
      icon: Plug,
      hint: "Status repo & environment",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan"
        description="Profil perusahaan, menu Alat, audit trail, roadmap, backlog, dan checklist QA."
      />

      <SettingsTools active={tab} onSelect={(id) => setTab(id as Tab)} extraTiles={sectionTiles} />

      {tab === "preferensi" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <div className="flex items-center gap-2 border-b border-border p-4">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <p className="font-bold">Preferensi Umum</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <Field label="Tahun Buku" hint="Dipakai pada laporan dan pembuka buku.">
                <Input
                  value={fiscalYear}
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(e) => setFiscalYear(e.target.value.replace(/\D/g, ""))}
                  placeholder="2026"
                />
              </Field>
              <Field label="Mata Uang" hint="Simbol yang dipakai di seluruh dokumen.">
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Format Tanggal" hint={`Contoh hari ini: ${sampleDate(dateFormat)}`}>
                <Select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                  {DATE_FORMATS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="PPN Default (%)" hint="Diisi otomatis pada faktur baru.">
                <Input
                  value={defaultTaxRate}
                  inputMode="decimal"
                  onChange={(e) =>
                    setDefaultTaxRate(e.target.value === "" ? "" : Number(e.target.value.replace(",", ".")))
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <ToggleRow
                  label="Peringatan stok menipis"
                  hint="Tampilkan banner saat barang menyentuh stok minimum di kasir."
                  checked={lowStockAlert}
                  onChange={setLowStockAlert}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  variant="accent"
                  onClick={submitPreferences}
                  disabled={pending || fiscalYear.length !== 4}
                >
                  {pending ? "Menyimpan…" : "Simpan Preferensi"}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-border p-4">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              <p className="font-bold">Ringkasan Aktif</p>
            </div>
            <div className="space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <span className="text-muted-foreground">Tahun buku</span>
                <span className="num font-semibold">{fiscalYear || "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <span className="text-muted-foreground">Mata uang</span>
                <span className="num font-semibold">{currency}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <span className="text-muted-foreground">Format tanggal</span>
                <span className="num font-semibold">{sampleDate(dateFormat)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <span className="text-muted-foreground">PPN default</span>
                <span className="num font-semibold">{Number(defaultTaxRate) || 0}%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
                <span className="text-muted-foreground">Peringatan stok</span>
                <Badge variant={lowStockAlert ? "success" : "outline"}>
                  {lowStockAlert ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Pengaturan ini dipakai sebagai nilai awal saat membuat dokumen baru — nilai pada
                dokumen lama tidak ikut berubah.
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "akses-grup" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold">Peran &amp; Hak Akses</p>
            <Badge variant="outline">{ROLE_PERMISSIONS.length} peran</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ROLE_PERMISSIONS.map((group) => {
              const count = accessSummary?.find((row) => row.role === group.role)?.count ?? 0;
              return (
                <Card key={group.role} className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{group.label}</p>
                    <Badge variant={group.role === "owner" ? "success" : "outline"}>
                      {count} anggota
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{group.desc}</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {group.perms.map((perm) => (
                      <li key={perm} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gg-teal" />
                        <span className="text-foreground/85">{perm}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
          <Card className="border-dashed p-4 text-xs text-muted-foreground">
            Penetapan peran ke orang dilakukan di tab <span className="font-semibold">Pengguna</span>.
            Workflow approval berjenjang (diskon besar, void, voiding dokumen yang sudah dibayar)
            masih masuk roadmap V2.
          </Card>
        </div>
      ) : null}

      {tab === "pengguna" ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-muted-foreground" />
              <p className="font-bold">Anggota Tim</p>
              <Badge variant="outline">{(members ?? []).length} orang</Badge>
            </div>
            <Button variant="accent" size="sm" onClick={() => setMemberOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Undang Pengguna
            </Button>
          </div>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Nama</TH>
                  <TH>Email</TH>
                  <TH>Peran</TH>
                  <TH>Status</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {(members ?? []).map((member) => {
                  const isOwner = member.role === "owner";
                  const active = member.status === "active";
                  return (
                    <TR key={member._id}>
                      <TD className="font-medium">
                        {member.name}
                        {member.email === me?.email ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">(Anda)</span>
                        ) : null}
                      </TD>
                      <TD className="text-xs text-muted-foreground">{member.email}</TD>
                      <TD>
                        <Badge variant={isOwner ? "success" : "outline"}>{member.roleLabel}</Badge>
                      </TD>
                      <TD>
                        <Badge variant={active ? "info" : "warning"}>
                          {active ? "Aktif" : "Belum masuk"}
                        </Badge>
                      </TD>
                      <TD>
                        {isOwner ? (
                          <span className="text-xs text-muted-foreground">Pemilik</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleMemberStatus(member._id, member.name, active)
                              }
                            >
                              {active ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => deleteMember(member._id, member.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Anggota baru berstatus <span className="font-semibold">Belum masuk</span> sampai
            mendaftar memakai email yang sama. Akun pemilik tidak bisa dinonaktifkan atau dihapus.
          </p>
        </Card>
      ) : null}

      {tab === "desain-cetakan" ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <div className="flex items-center gap-2 border-b border-border p-4">
              <Printer className="h-4 w-4 text-muted-foreground" />
              <p className="font-bold">Desain Cetakan</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <Field label="Lebar Struk">
                <Select value={receiptSize} onChange={(e) => setReceiptSize(e.target.value)}>
                  {RECEIPT_SIZES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Footer Struk" hint="Tercetak di bawah ringkasan pembayaran.">
                <Input
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Terima kasih telah berbelanja"
                />
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <ToggleRow
                  label="Tampilkan logo di struk"
                  hint="Nama perusahaan dicetak sebagai Kop."
                  checked={showReceiptLogo}
                  onChange={setShowReceiptLogo}
                />
                <ToggleRow
                  label="Tampilkan rincian PPN"
                  hint="Pisahkan DPP dan PPN pada setiap baris."
                  checked={showTaxDetail}
                  onChange={setShowTaxDetail}
                />
              </div>
              <div className="sm:col-span-2">
                <Button variant="accent" onClick={submitPrintDesign} disabled={pending}>
                  {pending ? "Menyimpan…" : "Simpan Desain Cetakan"}
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contoh struk
            </p>
            <div
              className="w-full max-w-[300px] rounded-lg border border-border bg-white p-4 font-mono text-[11px] leading-snug text-black shadow-md"
              style={receiptSize === "58mm" ? { maxWidth: 224 } : undefined}
            >
              <div className="text-center font-bold uppercase">
                {showReceiptLogo ? name || "Toko GG Online" : "STRUK PEMBAYARAN"}
              </div>
              {showReceiptLogo ? (
                <div className="mt-1 text-center">
                  {address || "Alamat perusahaan"}
                  {taxId ? <div>NPWP {taxId}</div> : null}
                </div>
              ) : null}
              <div className="my-2 border-t border-dashed border-black/40" />
              <div className="flex justify-between">
                <span>No.</span>
                <span>INV/2026/0001</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>{sampleDate(dateFormat)}</span>
              </div>
              <div className="my-2 border-t border-dashed border-black/40" />
              <div>2 x Bibit prices 5.000</div>
              {showTaxDetail ? <div className="pl-2">PPN 11% 1.100</div> : null}
              <div>1 x Pupuk 25 kg 65.000</div>
              {showTaxDetail ? <div className="pl-2">PPN 11% 7.150</div> : null}
              <div className="my-2 border-t border-dashed border-black/40" />
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>Rp 78.250</span>
              </div>
              {showTaxDetail ? (
                <div className="flex justify-between">
                  <span>DPP</span>
                  <span>Rp 70.500</span>
                </div>
              ) : null}
              <div className="my-2 border-t border-dashed border-black/40" />
              <div className="text-center">{receiptFooter || "Terima kasih telah berbelanja"}</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pratinjau kasar — hasil sebenarnya mengikuti printer thermal Anda.
            </p>
          </div>
        </div>
      ) : null}

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
              <div className="rounded-lg border border-border p-3">
                <p className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-gg-teal" /> Butuh panduan langkah demi
                  langkah?
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tutorial berjalan mengikuti setiap menu program dan bisa dilewati kapan saja.
                </p>
                <TutorialLauncher className="mt-2" />
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="flex items-center gap-1.5 font-semibold text-destructive">
                  <Eraser className="h-3.5 w-3.5" /> Kosongkan database
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hapus semua transaksi, jurnal, dan master data. Chart of Accounts dan Gudang
                  Utama tetap ada. Berguna untuk mulai pembukuan dari nol.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setWipeOpen(true)}
                >
                  Kosongkan database
                </Button>
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

      {tab === "integrasi" ? <GithubIntegration /> : null}

      {/* INVITE MEMBER DIALOG */}
      <Dialog
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        title="Undang Pengguna"
        description="Anggota akan terhubung otomatis begitu mendaftar memakai email ini."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              Batal
            </Button>
            <Button
              variant="accent"
              onClick={submitInvite}
              disabled={pending || !memberName.trim() || !memberEmail.trim()}
            >
              {pending ? "Menyimpan…" : "Undang"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nama Lengkap">
            <Input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Siti Rahma"
            />
          </Field>
          <Field label="Email" hint="Dipakai untuk masuk dan terhubung ke akun perusahaan.">
            <Input
              value={memberEmail}
              type="email"
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="siti@tokoanda.com"
            />
          </Field>
          <Field label="Peran" hint="Bisa diubah nanti dari daftar anggota.">
            <Select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
              {MEMBER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      {/* WIPE DIALOG */}
      <Dialog
        open={wipeOpen}
        onClose={() => setWipeOpen(false)}
        title="Kosongkan database?"
        description="Tindakan ini tidak bisa dibatalkan."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setWipeOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={submitWipe} disabled={pending}>
              {pending ? "Menghapus…" : "Ya, kosongkan"}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-2">
            <p>Yang akan dihapus permanen:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Barang &amp; jasa, pelanggan, pemasok</li>
              <li>Faktur penjualan, pembelian, retur, dan penerimaan/pembayaran</li>
              <li>Seluruh jurnal, kartu stok, dan aset tetap</li>
            </ul>
            <p className="text-muted-foreground">
              Yang tetap ada: Chart of Accounts sistem dan Gudang Utama.
            </p>
          </div>
        </div>
      </Dialog>

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
