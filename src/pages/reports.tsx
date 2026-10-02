import { useQuery } from "convex/react";
import {
  BarChart3,
  Boxes,
  Building2,
  Clock,
  FileSpreadsheet,
  Printer,
  Receipt,
  Scale,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import * as React from "react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { EmptyState, Loading, PageHeader, Stat, Tabs } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import {
  cn,
  currentMonthISO,
  downloadCSV,
  formatDate,
  formatIDR,
  formatNumber,
  monthEndISO,
  monthStartISO,
} from "@/lib/utils";

const REPORTS = [
  { value: "neraca", label: "Neraca" },
  { value: "labarugi", label: "Laba Rugi" },
  { value: "aruskas", label: "Arus Kas" },
  { value: "trial", label: "Trial Balance" },
  { value: "ar-aging", label: "AR Aging" },
  { value: "ap-aging", label: "AP Aging" },
  { value: "sales-customer", label: "Penjualan per Pelanggan" },
  { value: "sales-product", label: "Penjualan per Produk" },
  { value: "purchase-supplier", label: "Pembelian per Pemasok" },
  { value: "ppn", label: "Ringkasan PPN" },
  { value: "assets", label: "Register Aset" },
] as const;

type ReportTab = (typeof REPORTS)[number]["value"];

export default function Reports() {
  const month = currentMonthISO();
  const [tab, setTab] = React.useState<ReportTab>("neraca");
  const [from, setFrom] = React.useState(monthStartISO(month));
  const [to, setTo] = React.useState(monthEndISO(month));

  const trial = useQuery(api.reports.trialBalance, { to });
  const pnl = useQuery(api.reports.profitLoss, { from, to });
  const sheet = useQuery(api.reports.balanceSheet, { to });
  const flow = useQuery(api.reports.cashFlow, { from, to });

  // Extended report engine
  const arAging = useQuery(api.reports.arAging, { asOf: to });
  const apAging = useQuery(api.reports.apAging, { asOf: to });
  const salesByCustomer = useQuery(api.reports.salesByCustomer, { from, to });
  const salesByProduct = useQuery(api.reports.salesByProduct, { from, to });
  const purchasesBySupplier = useQuery(api.reports.purchasesBySupplier, { from, to });
  const taxSummary = useQuery(api.reports.taxSummary, { from, to });
  const assetRegister = useQuery(api.reports.assetRegister, {});

  const print = () => window.print();

  const exportCurrent = () => {
    if (tab === "trial" && trial) {
      downloadCSV("trial-balance.csv", [
        ["Kode", "Akun", "Tipe", "Debit", "Kredit", "Saldo"],
        ...trial.rows.map((row: any) => [row.code, row.name, row.type, row.debit, row.credit, row.balance]),
      ]);
    } else if (tab === "labarugi" && pnl) {
      downloadCSV("laba-rugi.csv", [
        ["Kategori", "Kode", "Akun", "Nilai"],
        ...pnl.revenues.map((row: any) => ["Pendapatan", row.code, row.name, row.amount]),
        ...pnl.expenses.map((row: any) => ["Beban", row.code, row.name, row.amount]),
        ["", "", "Total Pendapatan", pnl.totalRevenue],
        ["", "", "Total Beban", pnl.totalExpense],
        ["", "", "Laba Bersih", pnl.netIncome],
      ]);
    } else if (tab === "neraca" && sheet) {
      downloadCSV("neraca.csv", [
        ["Kategori", "Kode", "Akun", "Nilai"],
        ...sheet.assets.map((row: any) => ["Aset", row.code, row.name, row.amount]),
        ...sheet.liabilities.map((row: any) => ["Liabilitas", row.code, row.name, row.amount]),
        ...sheet.equity.map((row: any) => ["Ekuitas", row.code, row.name, row.amount]),
        ["", "", "Laba Tahun Berjalan", sheet.earnings],
      ]);
    } else if (tab === "aruskas" && flow) {
      downloadCSV("arus-kas.csv", [
        ["Akun", "Saldo Awal", "Masuk", "Keluar", "Saldo Akhir"],
        ...flow.rows.map((row: any) => [row.name, row.opening, row.inflow, row.outflow, row.closing]),
      ]);
    } else if (tab === "ar-aging" && arAging) {
      downloadCSV("ar-aging.csv", [
        ["Pelanggan", "Faktur", "0-14 Hari", "15-30 Hari", ">30 Hari", "Umur Tertua", "Total"],
        ...arAging.rows.map((row: any) => [
          row.name, row.count, row.d0_14, row.d15_30, row.d30plus, row.oldest, row.total,
        ]),
        [
          "TOTAL", arAging.totals.count, arAging.totals.d0_14, arAging.totals.d15_30,
          arAging.totals.d30plus, "", arAging.totals.total,
        ],
      ]);
    } else if (tab === "ap-aging" && apAging) {
      downloadCSV("ap-aging.csv", [
        ["Pemasok", "Faktur", "0-14 Hari", "15-30 Hari", ">30 Hari", "Umur Tertua", "Total"],
        ...apAging.rows.map((row: any) => [
          row.name, row.count, row.d0_14, row.d15_30, row.d30plus, row.oldest, row.total,
        ]),
        [
          "TOTAL", apAging.totals.count, apAging.totals.d0_14, apAging.totals.d15_30,
          apAging.totals.d30plus, "", apAging.totals.total,
        ],
      ]);
    } else if (tab === "sales-customer" && salesByCustomer) {
      downloadCSV("penjualan-per-pelanggan.csv", [
        ["Pelanggan", "Jumlah Faktur", "Penjualan", "Retur", "Penjualan Bersih"],
        ...salesByCustomer.rows.map((row: any) => [row.name, row.invoiceCount, row.gross, row.returns, row.net]),
        ["TOTAL", salesByCustomer.totals.invoiceCount, salesByCustomer.totals.gross, salesByCustomer.totals.returns, salesByCustomer.totals.net],
      ]);
    } else if (tab === "sales-product" && salesByProduct) {
      downloadCSV("penjualan-per-produk.csv", [
        ["SKU", "Produk", "Qty", "Penjualan", "HPP", "Retur", "Laba Kotor"],
        ...salesByProduct.rows.map((row: any) => [
          row.sku, row.name, row.qty, row.sales, row.cogs, row.returns, row.profit,
        ]),
        [
          "", "TOTAL", salesByProduct.totals.qty, salesByProduct.totals.sales,
          salesByProduct.totals.cogs, salesByProduct.totals.returns, salesByProduct.totals.profit,
        ],
      ]);
    } else if (tab === "purchase-supplier" && purchasesBySupplier) {
      downloadCSV("pembelian-per-pemasok.csv", [
        ["Pemasok", "Jumlah Faktur", "Total Pembelian"],
        ...purchasesBySupplier.rows.map((row: any) => [row.name, row.billCount, row.gross]),
        ["TOTAL", purchasesBySupplier.totals.billCount, purchasesBySupplier.totals.gross],
      ]);
    } else if (tab === "ppn" && taxSummary) {
      downloadCSV("ringkasan-ppn.csv", [
        ["Komponen", "DPP", "PPN", "Dokumen"],
        ["PPN Keluaran (penjualan)", taxSummary.output.base, taxSummary.output.tax, taxSummary.output.invoiceCount],
        ["Retur penjualan", -taxSummary.returns.base, -taxSummary.returns.tax, taxSummary.returns.count],
        ["PPN Keluaran Neto", taxSummary.outputNet.base, taxSummary.outputNet.tax, ""],
        ["PPN Masukan (pembelian)", taxSummary.input.base, taxSummary.input.tax, taxSummary.input.billCount],
        ["PPN Kurang Bayar", "", taxSummary.payable, ""],
      ]);
    } else if (tab === "assets" && assetRegister) {
      downloadCSV("register-aset.csv", [
        ["Kode", "Nama", "Kategori", "Tgl Perolehan", "Nilai Perolehan", "Metode", "Akumulasi", "Nilai Buku", "Status"],
        ...assetRegister.rows.map((row: any) => [
          row.code, row.name, row.category ?? "", row.acquisitionDate, row.cost,
          row.method === "straight_line" ? "Garis Lurus" : "Saldo Menurun",
          row.accumulatedDepreciation, row.bookValue, row.status === "active" ? "Aktif" : "Dijual",
        ]),
        [
          "", "TOTAL (Aktif)", "", "", assetRegister.summary.totalCost, "",
          assetRegister.summary.totalAccumulated, assetRegister.summary.totalBookValue, "",
        ],
      ]);
    }
  };

  const ready =
    trial !== undefined &&
    pnl !== undefined &&
    sheet !== undefined &&
    flow !== undefined &&
    arAging !== undefined &&
    apAging !== undefined &&
    salesByCustomer !== undefined &&
    salesByProduct !== undefined &&
    purchasesBySupplier !== undefined &&
    taxSummary !== undefined &&
    assetRegister !== undefined;
  if (!ready) return <Loading label="Menghitung laporan dari ledger…" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Keuangan"
        description="Semua laporan diturunkan dari satu ledger double-entry yang sama."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={print}>
              <Printer className="h-3.5 w-3.5" /> Cetak
            </Button>
            <Button variant="accent" size="sm" onClick={exportCurrent}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 no-print">
        <Field label="Dari Tanggal">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Sampai Tanggal">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {[
            { label: "Bulan ini", from: monthStartISO(month), to: monthEndISO(month) },
            {
              label: "Kuartal",
              from: `${month.slice(0, 4)}-01-01`,
              to: monthEndISO(`${month.slice(0, 4)}-03`),
            },
            {
              label: "YTD",
              from: `${month.slice(0, 4)}-01-01`,
              to: monthEndISO(month),
            },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setFrom(preset.from);
                setTo(preset.to);
              }}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as ReportTab)}
        tabs={REPORTS.map((report) => ({ value: report.value, label: report.label }))}
      />

      <div className="print-area">
        {tab === "neraca" && sheet ? <BalanceSheetView sheet={sheet} /> : null}
        {tab === "labarugi" && pnl ? <ProfitLossView pnl={pnl} /> : null}
        {tab === "aruskas" && flow ? <CashFlowView flow={flow} /> : null}
        {tab === "trial" && trial ? <TrialBalanceView trial={trial} /> : null}
        {tab === "ar-aging" && arAging ? <AgingView
          title="Piutang Usaha (AR Aging)"
          subtitle="Outstanding piutang pelanggan per umur faktur"
          partyLabel="Pelanggan"
          data={arAging}
          tone="warning"
        /> : null}
        {tab === "ap-aging" && apAging ? <AgingView
          title="Utang Usaha (AP Aging)"
          subtitle="Outstanding utang pemasok per umur faktur"
          partyLabel="Pemasok"
          data={apAging}
          tone="danger"
        /> : null}
        {tab === "sales-customer" && salesByCustomer ? (
          <SalesByCustomerView data={salesByCustomer} from={from} to={to} />
        ) : null}
        {tab === "sales-product" && salesByProduct ? (
          <SalesByProductView data={salesByProduct} from={from} to={to} />
        ) : null}
        {tab === "purchase-supplier" && purchasesBySupplier ? (
          <PurchasesBySupplierView data={purchasesBySupplier} from={from} to={to} />
        ) : null}
        {tab === "ppn" && taxSummary ? <TaxSummaryView data={taxSummary} from={from} to={to} /> : null}
        {tab === "assets" && assetRegister ? <AssetRegisterView data={assetRegister} /> : null}
      </div>
    </div>
  );
}

function AgingView({
  title,
  subtitle,
  partyLabel,
  data,
  tone,
}: {
  title: string;
  subtitle: string;
  partyLabel: string;
  data: any;
  tone: "warning" | "danger";
}) {
  return (
    <ReportShell title={title} subtitle={`${subtitle} — per ${formatDate(data.asOf)}`}>
      {data.rows.length === 0 ? (
        <EmptyState
          title="Tidak ada outstanding"
          description={`Tidak ada ${partyLabel.toLowerCase()} dengan saldo belum lunas per tanggal ini.`}
        />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Belum jatuh tempo (0-14)" value={formatIDR(data.totals.d0_14)} icon={<Clock className="h-4 w-4" />} />
            <Stat label="15-30 hari" value={formatIDR(data.totals.d15_30)} tone="warning" icon={<Clock className="h-4 w-4" />} />
            <Stat label="Lebih dari 30 hari" value={formatIDR(data.totals.d30plus)} tone={tone === "danger" ? "negative" : "warning"} icon={<Clock className="h-4 w-4" />} />
          </div>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>{partyLabel}</TH>
                  <TH className="text-center">Faktur</TH>
                  <TH className="text-right">0-14 Hari</TH>
                  <TH className="text-right">15-30 Hari</TH>
                  <TH className="text-right">&gt;30 Hari</TH>
                  <TH className="text-center">Umur Tertua</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {data.rows.map((row: any) => (
                  <TR key={row.key}>
                    <TD className="font-medium">{row.name}</TD>
                    <TD className="num text-center">
                      <Badge variant={row.count > 2 ? tone : "outline"}>{row.count}</Badge>
                    </TD>
                    <TD className="num text-right">{row.d0_14 ? formatIDR(row.d0_14) : "—"}</TD>
                    <TD className="num text-right">{row.d15_30 ? formatIDR(row.d15_30) : "—"}</TD>
                    <TD className="num text-right">{row.d30plus ? formatIDR(row.d30plus) : "—"}</TD>
                    <TD className="num text-center">
                      {row.oldest > 30 ? (
                        <Badge variant="danger">{row.oldest} hari</Badge>
                      ) : (
                        <span>{row.oldest} hari</span>
                      )}
                    </TD>
                    <TD className="num text-right font-bold">{formatIDR(row.total)}</TD>
                  </TR>
                ))}
                <TR className="bg-navy-950 font-bold text-white">
                  <TD colSpan={2}>TOTAL ({data.totals.count} faktur)</TD>
                  <TD className="num text-right text-gg-lime">{formatIDR(data.totals.d0_14)}</TD>
                  <TD className="num text-right text-gg-lime">{formatIDR(data.totals.d15_30)}</TD>
                  <TD className="num text-right text-gg-lime">{formatIDR(data.totals.d30plus)}</TD>
                  <TD />
                  <TD className="num text-right text-gg-lime">{formatIDR(data.totals.total)}</TD>
                </TR>
              </TBody>
            </Table>
          </TableWrap>
        </>
      )}
    </ReportShell>
  );
}

function SalesByCustomerView({ data, from, to }: { data: any; from: string; to: string }) {
  return (
    <ReportShell
      title="Penjualan per Pelanggan"
      subtitle={`Periode ${formatDate(from)} — ${formatDate(to)} (neto setelah retur)`}
      footnote={
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {data.rows.length} pelanggan • {data.totals.invoiceCount} faktur
        </span>
      }
    >
      {data.rows.length === 0 ? (
        <EmptyState title="Belum ada penjualan pada periode ini" />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Pelanggan</TH>
                <TH className="text-center">Faktur</TH>
                <TH className="text-right">Penjualan</TH>
                <TH className="text-right">Retur</TH>
                <TH className="text-right">Penjualan Bersih</TH>
                <TH className="text-right">Kontribusi</TH>
              </TR>
            </THead>
            <TBody>
              {data.rows.map((row: any) => (
                <TR key={row.key}>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="num text-center">{row.invoiceCount}</TD>
                  <TD className="num text-right">{formatIDR(row.gross)}</TD>
                  <TD className="num text-right">{row.returns ? <span className="text-rose-600">-{formatIDR(row.returns)}</span> : "—"}</TD>
                  <TD className="num text-right font-bold">{formatIDR(row.net)}</TD>
                  <TD className="num text-right text-muted-foreground">
                    {data.totals.net > 0 ? `${Math.round((row.net / data.totals.net) * 100)}%` : "—"}
                  </TD>
                </TR>
              ))}
              <TR className="bg-navy-950 font-bold text-white">
                <TD colSpan={2}>TOTAL</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.totals.gross)}</TD>
                <TD className="num text-right text-gg-lime">-{formatIDR(data.totals.returns)}</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.totals.net)}</TD>
                <TD className="num text-right text-gg-lime">100%</TD>
              </TR>
            </TBody>
          </Table>
        </TableWrap>
      )}
    </ReportShell>
  );
}

function SalesByProductView({ data, from, to }: { data: any; from: string; to: string }) {
  return (
    <ReportShell
      title="Penjualan per Produk"
      subtitle={`Periode ${formatDate(from)} — ${formatDate(to)} (labu kotor per SKU)`}
    >
      {data.rows.length === 0 ? (
        <EmptyState title="Belum ada penjualan pada periode ini" />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>SKU</TH>
                <TH>Produk</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-right">Penjualan</TH>
                <TH className="text-right">HPP</TH>
                <TH className="text-right">Retur</TH>
                <TH className="text-right">Laba Kotor</TH>
                <TH className="text-right">Margin</TH>
              </TR>
            </THead>
            <TBody>
              {data.rows.map((row: any) => (
                <TR key={row.sku}>
                  <TD className="num text-xs font-semibold text-muted-foreground">{row.sku}</TD>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="num text-right">
                    {formatNumber(row.qty)} {row.unit}
                    {row.returnsQty ? (
                      <span className="ml-1 text-xs text-rose-600">(-{formatNumber(row.returnsQty)})</span>
                    ) : null}
                  </TD>
                  <TD className="num text-right">{formatIDR(row.sales)}</TD>
                  <TD className="num text-right">{formatIDR(row.cogs)}</TD>
                  <TD className="num text-right">{row.returns ? <span className="text-rose-600">-{formatIDR(row.returns)}</span> : "—"}</TD>
                  <TD className={cn("num text-right font-bold", row.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {formatIDR(row.profit)}
                  </TD>
                  <TD className="num text-right text-muted-foreground">
                    {row.sales - row.returns > 0
                      ? `${Math.round(((row.sales - row.returns - (row.cogs - row.returnsCost)) / (row.sales - row.returns)) * 100)}%`
                    : "—"}
                  </TD>
                </TR>
              ))}
              <TR className="bg-navy-950 font-bold text-white">
                <TD colSpan={2}>TOTAL</TD>
                <TD className="num text-right text-gg-lime">{formatNumber(data.totals.qty)}</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.totals.sales)}</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.totals.cogs)}</TD>
                <TD className="num text-right text-gg-lime">-{formatIDR(data.totals.returns)}</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.totals.profit)}</TD>
                <TD className="num text-right text-gg-lime">
                  {data.totals.sales - data.totals.returns > 0
                    ? `${Math.round((data.totals.profit / (data.totals.sales - data.totals.returns)) * 100)}%`
                    : "—"}
                </TD>
              </TR>
            </TBody>
          </Table>
        </TableWrap>
      )}
    </ReportShell>
  );
}

function PurchasesBySupplierView({ data, from, to }: { data: any; from: string; to: string }) {
  return (
    <ReportShell
      title="Pembelian per Pemasok"
      subtitle={`Periode ${formatDate(from)} — ${formatDate(to)}`}
      footnote={
        <span className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5" /> {data.rows.length} pemasok • {data.totals.billCount} faktur beli
        </span>
      }
    >
      {data.rows.length === 0 ? (
        <EmptyState title="Belum ada pembelian pada periode ini" />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Pemasok</TH>
                <TH className="text-center">Faktur</TH>
                <TH className="text-right">Total Pembelian</TH>
                <TH className="text-right">Kontribusi</TH>
              </TR>
            </THead>
            <TBody>
              {data.rows.map((row: any) => (
                <TR key={row.key}>
                  <TD className="font-medium">{row.name}</TD>
                  <TD className="num text-center">{row.billCount}</TD>
                  <TD className="num text-right font-bold">{formatIDR(row.gross)}</TD>
                  <TD className="num text-right text-muted-foreground">
                    {data.totals.gross > 0 ? `${Math.round((row.gross / data.totals.gross) * 100)}%` : "—"}
                  </TD>
                </TR>
              ))}
              <TR className="bg-navy-950 font-bold text-white">
                <TD colSpan={2}>TOTAL</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.totals.gross)}</TD>
                <TD className="num text-right text-gg-lime">100%</TD>
              </TR>
            </TBody>
          </Table>
        </TableWrap>
      )}
    </ReportShell>
  );
}

function TaxSummaryView({ data, from, to }: { data: any; from: string; to: string }) {
  const rows: Array<{ label: string; base: number; tax: number; docs?: number; strong?: boolean }> = [
    { label: "PPN Keluaran — Penjualan", base: data.output.base, tax: data.output.tax, docs: data.output.invoiceCount },
    {
      label: "Dikurangi: Retur Penjualan",
      base: -data.returns.base,
      tax: -data.returns.tax,
      docs: data.returns.count,
    },
    { label: "PPN Keluaran Neto", base: data.outputNet.base, tax: data.outputNet.tax, strong: true },
    { label: "PPN Masukan — Pembelian", base: data.input.base, tax: data.input.tax, docs: data.input.billCount },
  ];
  return (
    <ReportShell
      title="Ringkasan PPN Masukan / Keluaran"
      subtitle={`Periode ${formatDate(from)} — ${formatDate(to)}`}
      footnote="Laporan bantu rekonsiliasi PPN — bukan pengganti SPT Masa PPN."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="PPN Keluaran Neto" value={formatIDR(data.outputNet.tax)} icon={<Receipt className="h-4 w-4" />} />
        <Stat label="PPN Masukan" value={formatIDR(data.input.tax)} icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat
          label={data.payable >= 0 ? "PPN Kurang Bayar" : "PPN Lebih Bayar"}
          value={formatIDR(Math.abs(data.payable))}
          tone={data.payable >= 0 ? "warning" : "positive"}
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>
      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Komponen</TH>
              <TH className="text-right">DPP (Dasar Pengenaan Pajak)</TH>
              <TH className="text-right">PPN</TH>
              <TH className="text-center">Dokumen</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.label} className={row.strong ? "bg-secondary/50 font-semibold" : undefined}>
                <TD>{row.label}</TD>
                <TD className="num text-right">{formatIDR(row.base)}</TD>
                <TD className={cn("num text-right", row.strong && "font-bold")}>{formatIDR(row.tax)}</TD>
                <TD className="num text-center">{row.docs ?? "—"}</TD>
              </TR>
            ))}
            <TR className="bg-navy-950 font-bold text-white">
              <TD>{data.payable >= 0 ? "PPN Kurang Bayar (Keluaran - Masukan)" : "PPN Lebih Bayar"}</TD>
              <TD />
              <TD className="num text-right text-gg-lime">{formatIDR(Math.abs(data.payable))}</TD>
              <TD />
            </TR>
          </TBody>
        </Table>
      </TableWrap>
    </ReportShell>
  );
}

function AssetRegisterView({ data }: { data: any }) {
  return (
    <ReportShell
      title="Register Aset Tetap"
      subtitle="Daftar aset, akumulasi penyusutan, dan nilai buku"
      footnote={
        <span className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> {data.summary.activeCount} aset aktif • {data.summary.disposedCount} dijual
        </span>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Nilai Perolehan (Aktif)" value={formatIDR(data.summary.totalCost)} icon={<Boxes className="h-4 w-4" />} />
        <Stat label="Akumulasi Penyusutan" value={formatIDR(data.summary.totalAccumulated)} tone="warning" icon={<Boxes className="h-4 w-4" />} />
        <Stat label="Nilai Buku" value={formatIDR(data.summary.totalBookValue)} tone="lime" icon={<Boxes className="h-4 w-4" />} />
      </div>
      {data.rows.length === 0 ? (
        <EmptyState title="Belum ada aset tetap" description="Catat perolehan aset pada modul Aset Tetap." />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Kode</TH>
                <TH>Nama Aset</TH>
                <TH>Perolehan</TH>
                <TH className="text-right">Nilai Perolehan</TH>
                <TH>Metode</TH>
                <TH className="text-right">Akumulasi</TH>
                <TH className="text-right">Nilai Buku</TH>
                <TH className="text-center">Status</TH>
              </TR>
            </THead>
            <TBody>
              {data.rows.map((row: any) => (
                <TR key={row.code} className={row.status === "disposed" ? "opacity-60" : undefined}>
                  <TD className="num text-xs font-semibold">{row.code}</TD>
                  <TD>
                    <span className="font-medium">{row.name}</span>
                    {row.category ? <span className="ml-1.5 text-xs text-muted-foreground">({row.category})</span> : null}
                  </TD>
                  <TD className="text-xs">{formatDate(row.acquisitionDate)}</TD>
                  <TD className="num text-right">{formatIDR(row.cost)}</TD>
                  <TD className="text-xs">{row.method === "straight_line" ? "Garis Lurus" : "Saldo Menurun"}</TD>
                  <TD className="num text-right">{formatIDR(row.accumulatedDepreciation)}</TD>
                  <TD className="num text-right font-bold">{formatIDR(row.bookValue)}</TD>
                  <TD className="text-center">
                    <Badge variant={row.status === "active" ? "success" : "danger"}>
                      {row.status === "active" ? "Aktif" : "Dijual"}
                    </Badge>
                  </TD>
                </TR>
              ))}
              <TR className="bg-navy-950 font-bold text-white">
                <TD colSpan={3}>TOTAL (ASET AKTIF)</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.summary.totalCost)}</TD>
                <TD />
                <TD className="num text-right text-gg-lime">{formatIDR(data.summary.totalAccumulated)}</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(data.summary.totalBookValue)}</TD>
                <TD />
              </TR>
            </TBody>
          </Table>
        </TableWrap>
      )}
    </ReportShell>
  );
}

function ReportShell({
  title,
  subtitle,
  children,
  footnote,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="border-b border-border p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          POS GG Online
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
      {footnote ? <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{footnote}</div> : null}
    </Card>
  );
}

function ProfitLossView({ pnl }: { pnl: any }) {
  return (
    <ReportShell title="Laporan Laba Rugi" subtitle="Basis akrual dari jurnal harian">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Pendapatan</p>
          {pnl.revenues.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Belum ada pendapatan pada periode ini.</p>
          ) : (
            pnl.revenues.map((row: any) => (
              <div key={row._id} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
                <span>
                  <span className="num mr-2 text-xs text-muted-foreground">{row.code}</span>
                  {row.name}
                </span>
                <span className="num font-semibold">{formatIDR(row.amount)}</span>
              </div>
            ))
          )}
          <div className="mt-2 flex items-center justify-between text-sm font-bold">
            <span>Total Pendapatan</span>
            <span className="num">{formatIDR(pnl.totalRevenue)}</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600">Beban &amp; HPP</p>
          {pnl.expenses.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Belum ada beban pada periode ini.</p>
          ) : (
            pnl.expenses.map((row: any) => (
              <div key={row._id} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
                <span>
                  <span className="num mr-2 text-xs text-muted-foreground">{row.code}</span>
                  {row.name}
                </span>
                <span className="num font-semibold">{formatIDR(row.amount)}</span>
              </div>
            ))
          )}
          <div className="mt-2 flex items-center justify-between text-sm font-bold">
            <span>Total Beban</span>
            <span className="num">{formatIDR(pnl.totalExpense)}</span>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3 text-white",
            pnl.netIncome >= 0 ? "bg-navy-950" : "bg-destructive",
          )}
        >
          <span className="text-sm font-bold uppercase tracking-wide">
            {pnl.netIncome >= 0 ? "Laba Bersih" : "Rugi Bersih"}
          </span>
          <span className={cn("num text-xl font-extrabold", pnl.netIncome >= 0 && "text-gg-lime")}>
            {formatIDR(pnl.netIncome)}
          </span>
        </div>
      </div>
    </ReportShell>
  );
}

function BalanceSheetView({ sheet }: { sheet: any }) {
  return (
    <ReportShell
      title="Neraca (Laporan Posisi Keuangan)"
      subtitle="Per posisi tanggal"
      footnote={
        sheet.balanced ? (
          <span className="flex items-center gap-1.5 text-emerald-600">
            <Scale className="h-3.5 w-3.5" /> Aset = Liabilitas + Ekuitas — neraca seimbang.
          </span>
        ) : (
          <span className="text-rose-600">Neraca tidak seimbang — periksa jurnal manual.</span>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-600">Aset</p>
          {sheet.assets.map((row: any) => (
            <div key={row._id} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
              <span>
                <span className="num mr-2 text-xs text-muted-foreground">{row.code}</span>
                {row.name}
              </span>
              <span className="num font-semibold">{formatIDR(row.amount)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between text-sm font-bold">
            <span>Total Aset</span>
            <span className="num">{formatIDR(sheet.totalAssets)}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">Liabilitas</p>
            {sheet.liabilities.map((row: any) => (
              <div key={row._id} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
                <span>
                  <span className="num mr-2 text-xs text-muted-foreground">{row.code}</span>
                  {row.name}
                </span>
                <span className="num font-semibold">{formatIDR(row.amount)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between text-sm font-bold">
              <span>Total Liabilitas</span>
              <span className="num">{formatIDR(sheet.totalLiabilities)}</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Ekuitas</p>
            {sheet.equity.map((row: any) => (
              <div key={row._id} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
                <span>
                  <span className="num mr-2 text-xs text-muted-foreground">{row.code}</span>
                  {row.name}
                </span>
                <span className="num font-semibold">{formatIDR(row.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
              <span>
                <span className="num mr-2 text-xs text-muted-foreground">—</span>
                Laba Tahun Berjalan
              </span>
              <span className="num font-semibold">{formatIDR(sheet.earnings)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm font-bold">
              <span>Total Ekuitas</span>
              <span className="num">{formatIDR(sheet.totalEquity)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-navy-950 px-4 py-3 text-white">
            <span className="text-sm font-bold uppercase tracking-wide">Liabilitas + Ekuitas</span>
            <span className="num text-lg font-extrabold text-gg-lime">
              {formatIDR(sheet.totalLiabilitiesEquity)}
            </span>
          </div>
        </div>
      </div>
    </ReportShell>
  );
}

function CashFlowView({ flow }: { flow: any }) {
  return (
    <ReportShell title="Laporan Arus Kas" subtitle="Basis kas — pergerakan rekening kas & bank">
      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Rekening</TH>
              <TH className="text-right">Saldo Awal</TH>
              <TH className="text-right">Kas Masuk</TH>
              <TH className="text-right">Kas Keluar</TH>
              <TH className="text-right">Saldo Akhir</TH>
            </TR>
          </THead>
          <TBody>
            {flow.rows.map((row: any) => (
              <TR key={row._id}>
                <TD>
                  <Badge variant={row.kind === "cash" ? "success" : "info"}>
                    {row.kind === "cash" ? "Kas" : "Bank"}
                  </Badge>{" "}
                  {row.name}
                </TD>
                <TD className="num text-right">{formatIDR(row.opening)}</TD>
                <TD className="num text-right text-emerald-600">{formatIDR(row.inflow)}</TD>
                <TD className="num text-right text-rose-600">{formatIDR(row.outflow)}</TD>
                <TD className="num text-right font-bold">{formatIDR(row.closing)}</TD>
              </TR>
            ))}
            <TR className="bg-secondary/50 font-bold">
              <TD>Total</TD>
              <TD className="num text-right">{formatIDR(flow.totalOpening)}</TD>
              <TD className="num text-right">{formatIDR(flow.totalInflow)}</TD>
              <TD className="num text-right">{formatIDR(flow.totalOutflow)}</TD>
              <TD className="num text-right">{formatIDR(flow.totalClosing)}</TD>
            </TR>
          </TBody>
        </Table>
      </TableWrap>
      <p className="mt-3 text-xs text-muted-foreground">
        Catatan: laporan arus kas ini adalah versi basis kas per rekening. Klasifikasi operasi/
        investasi/pembiayaan tersedia pada roadmap V2.
      </p>
    </ReportShell>
  );
}

function TrialBalanceView({ trial }: { trial: any }) {
  return (
    <ReportShell
      title="Trial Balance (Neraca Saldo)"
      subtitle="Total debit harus sama dengan total kredit"
      footnote={
        <span className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          {trial.totalDebit === trial.totalCredit ? (
            <span className="text-emerald-600">Seimbang — debit = kredit</span>
          ) : (
            <span className="text-rose-600">Tidak seimbang!</span>
          )}
        </span>
      }
    >
      {trial.rows.length === 0 ? (
        <EmptyState title="Belum ada transaksi" />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Kode</TH>
                <TH>Nama Akun</TH>
                <TH className="text-right">Debit</TH>
                <TH className="text-right">Kredit</TH>
                <TH className="text-right">Saldo (D-K)</TH>
              </TR>
            </THead>
            <TBody>
              {trial.rows.map((row: any) => (
                <TR key={row._id}>
                  <TD className="num font-semibold">{row.code}</TD>
                  <TD>{row.name}</TD>
                  <TD className="num text-right">{row.debit ? formatIDR(row.debit) : "—"}</TD>
                  <TD className="num text-right">{row.credit ? formatIDR(row.credit) : "—"}</TD>
                  <TD className="num text-right font-semibold">{formatIDR(row.balance)}</TD>
                </TR>
              ))}
              <TR className="bg-navy-950 font-bold text-white">
                <TD colSpan={2}>TOTAL</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(trial.totalDebit)}</TD>
                <TD className="num text-right text-gg-lime">{formatIDR(trial.totalCredit)}</TD>
                <TD />
              </TR>
            </TBody>
          </Table>
        </TableWrap>
      )}
    </ReportShell>
  );
}
