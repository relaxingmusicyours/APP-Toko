import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  ClipboardList,
  FileSpreadsheet,
  History,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { InventoryMenu } from "@/components/inventory-menu";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Loading, PageHeader, Stat } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import {
  cn,
  downloadCSV,
  errorMessage,
  formatDate,
  formatIDR,
  formatNumber,
  todayISO,
} from "@/lib/utils";
import { useViewTarget } from "@/lib/view-target";

export default function Inventory() {
  const stockReport = useQuery(api.inventory.stockReport);
  const movements = useQuery(api.inventory.movements, {});
  const opname = useMutation(api.inventory.opname);

  const [tab, setTab] = React.useState("stok");
  const [search, setSearch] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("all");
  const [opnameOpen, setOpnameOpen] = React.useState(false);
  const [opnameItem, setOpnameItem] = React.useState<Id<"items"> | "">("");
  const [opnameWarehouse, setOpnameWarehouse] = React.useState<Id<"warehouses"> | "">("");
  const [countedQty, setCountedQty] = React.useState<number | "">("");
  const [opnameNote, setOpnameNote] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const rows = (stockReport?.rows ?? []).filter((row: any) => {
    if (warehouseFilter !== "all") return true; // per-warehouse cols shown anyway
    if (!search) return true;
    const q = search.toLowerCase();
    return row.name.toLowerCase().includes(q) || row.sku.toLowerCase().includes(q);
  });

  const totals = rows.reduce(
    (acc: { value: number; low: number }, row: any) => {
      if (row.trackStock) {
        acc.value += row.value;
        if (row.qty <= row.minStock) acc.low += 1;
      }
      return acc;
    },
    { value: 0, low: 0 },
  );

  const exportCsv = () => {
    const header = ["SKU", "Nama", "Kategori", "Unit", "Stok", "Min", "Harga Beli", "Harga Jual", "Nilai"];
    const body = rows.map((row: any) => [
      row.sku,
      row.name,
      row.category,
      row.unit,
      row.qty,
      row.minStock,
      row.costPrice,
      row.salePrice,
      row.value,
    ]);
    downloadCSV("persediaan.csv", [header, ...body]);
  };

  const openOpname = (item?: any) => {
    if (item) {
      setOpnameItem(item._id);
      const firstWh = item.perWarehouse?.[0];
      setOpnameWarehouse(firstWh?.warehouseId ?? stockReport?.warehouses?.[0]?._id ?? "");
      setCountedQty(item.qty);
    } else {
      setOpnameItem("");
      setOpnameWarehouse(stockReport?.warehouses?.[0]?._id ?? "");
      setCountedQty(0);
    }
    setOpnameNote("");
    setOpnameOpen(true);
  };

  const submitOpname = async () => {
    if (!opnameItem || !opnameWarehouse || countedQty === "") {
      toast.error("Lengkapi barang, gudang, dan hasil hitung");
      return;
    }
    setPending(true);
    try {
      const result = await opname({
        itemId: opnameItem as Id<"items">,
        warehouseId: opnameWarehouse as Id<"warehouses">,
        countedQty: Number(countedQty),
        date: todayISO(),
        note: opnameNote || undefined,
      });
      toast.success(
        `Opname ${result.number}: selisih ${result.diff > 0 ? "+" : ""}${result.diff} — jurnal koreksi diposting`,
      );
      setOpnameOpen(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  // Dipicu dari pop-up pemilihan dokumen di sidebar.
  useViewTarget((view) => {
    if (view === "riwayat") setTab("kartu");
    else if (view === "kartu-stok") setTab("stok");
    else if (view === "perintah-opname") openOpname();
  });

  if (stockReport === undefined || movements === undefined) {
    return <Loading label="Memuat persediaan…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Persediaan"
        description="Kartu stok multi-gudang dengan ledger pergerakan dan stok opname."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="accent" size="sm" onClick={() => openOpname()}>
              <ClipboardList className="h-3.5 w-3.5" /> Stok Opname
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Nilai Persediaan" value={formatIDR(totals.value, { compact: true })} icon={<Boxes className="h-4 w-4" />} />
        <Stat label="SKU Aktif" value={rows.filter((r: any) => r.isActive).length} />
        <Stat
          label="Stok di Bawah Minimum"
          value={totals.low}
          tone={totals.low > 0 ? "warning" : "positive"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <InventoryMenu
        active={tab === "kartu" ? "riwayat" : "kartu-stok"}
        onSelect={(id) => setTab(id === "riwayat" ? "kartu" : "stok")}
        onOpenOpname={() => openOpname()}
      />

      {tab === "stok" ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU / nama barang…"
              className="max-w-xs"
            />
            <Select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-auto"
            >
              <option value="all">Semua gudang</option>
              {(stockReport?.warehouses ?? []).map((wh: any) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </Select>
          </div>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>SKU / Barang</TH>
                  <TH className="text-right">Stok</TH>
                  <TH className="text-right">Min</TH>
                  {(stockReport?.warehouses ?? []).map((wh: any) => (
                    <TH key={wh._id} className="text-right">
                      {wh.name}
                    </TH>
                  ))}
                  <TH className="text-right">Harga Jual</TH>
                  <TH className="text-right">Nilai Stok</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row: any) => {
                  const low = row.trackStock && row.qty <= row.minStock;
                  return (
                    <TR key={row._id} className={cn(low && "bg-amber-50/60")}>
                      <TD>
                        <p className="font-semibold">{row.name}</p>
                        <p className="num text-xs text-muted-foreground">
                          {row.sku} • {row.category || "Tanpa kategori"}
                        </p>
                      </TD>
                      <TD className="num text-right font-bold">
                        {row.trackStock ? (
                          <span className={cn(low && "text-amber-600")}>
                            {formatNumber(row.qty)} {row.unit}
                          </span>
                        ) : (
                          <Badge variant="info">Jasa</Badge>
                        )}
                      </TD>
                      <TD className="num text-right text-muted-foreground">{row.minStock}</TD>
                      {row.perWarehouse.map((cell: any) => (
                        <TD key={cell.warehouseId} className="num text-right text-muted-foreground">
                          {formatNumber(cell.qty)}
                        </TD>
                      ))}
                      <TD className="num text-right">{formatIDR(row.salePrice)}</TD>
                      <TD className="num text-right font-semibold">{formatIDR(row.value)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      ) : (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Tanggal</TH>
                  <TH>Barang</TH>
                  <TH>Gudang</TH>
                  <TH>Jenis</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="text-right">Biaya Satuan</TH>
                  <TH>Ref</TH>
                </TR>
              </THead>
              <TBody>
                {movements.map((movement: any) => (
                  <TR key={movement._id}>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDate(movement.date)}</TD>
                    <TD className="font-medium">{movement.itemName}</TD>
                    <TD className="text-muted-foreground">{movement.warehouseName}</TD>
                    <TD>
                      <Badge
                        variant={
                          movement.refType === "SALE"
                            ? "info"
                            : movement.refType === "PURCHASE"
                              ? "success"
                              : movement.refType === "OPNAME"
                                ? "warning"
                                : "outline"
                        }
                      >
                        {movement.refType}
                      </Badge>
                    </TD>
                    <TD
                      className={cn(
                        "num text-right font-bold",
                        movement.qty > 0 ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {movement.qty > 0 ? "+" : ""}
                      {formatNumber(movement.qty)}
                    </TD>
                    <TD className="num text-right text-muted-foreground">{formatIDR(movement.unitCost)}</TD>
                    <TD className="num text-xs text-muted-foreground">
                      {movement.refNumber ?? "-"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      )}

      {/* OPNAME DIALOG */}
      <Dialog
        open={opnameOpen}
        onClose={() => setOpnameOpen(false)}
        title="Stok Opname"
        description="Hitung fisik, sistem menghitung selisih dan memposting jurnal koreksi."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpnameOpen(false)}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitOpname} disabled={pending}>
              {pending ? "Memposting…" : "Posting Opname"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Barang">
            <Select
              value={opnameItem}
              onChange={(e) => {
                setOpnameItem(e.target.value as Id<"items">);
                const item = (stockReport?.rows ?? []).find((r: any) => r._id === e.target.value);
                setCountedQty(item?.qty ?? 0);
              }}
            >
              <option value="">Pilih barang…</option>
              {(stockReport?.rows ?? [])
                .filter((row: any) => row.trackStock)
                .map((row: any) => (
                  <option key={row._id} value={row._id}>
                    {row.sku} • {row.name} (sistem: {row.qty})
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Gudang">
            <Select
              value={opnameWarehouse}
              onChange={(e) => setOpnameWarehouse(e.target.value as Id<"warehouses">)}
            >
              {(stockReport?.warehouses ?? []).map((wh: any) => (
                <option key={wh._id} value={wh._id}>
                  {wh.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hasil Hitung Fisik">
            <Input
              type="number"
              min={0}
              value={countedQty}
              onChange={(e) => (e.target.value === "" ? setCountedQty("") : setCountedQty(Number(e.target.value)))}
            />
          </Field>
          <Field label="Catatan">
            <Textarea
              value={opnameNote}
              onChange={(e) => setOpnameNote(e.target.value)}
              placeholder="Misal: rusak 2 pcs, salah hitung…"
            />
          </Field>
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            Selisih akan dijurnal ke akun 5-5500 Selisih Persediaan.
          </div>
        </div>
      </Dialog>
    </div>
  );
}
