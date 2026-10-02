import { useMutation, useQuery } from "convex/react";
import { Package, Pencil, Plus, Store, Truck, Users, Warehouse } from "lucide-react";
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
import { downloadCSV, errorMessage, formatIDR } from "@/lib/utils";

type Tab = "pelanggan" | "pemasok" | "barang" | "gudang";

export default function Masters() {
  const customers = useQuery(api.masters.customers);
  const suppliers = useQuery(api.masters.suppliers);
  const items = useQuery(api.masters.items);
  const warehouses = useQuery(api.masters.warehouses);
  const stock = useQuery(api.inventory.stockReport);

  const saveCustomer = useMutation(api.masters.saveCustomer);
  const saveSupplier = useMutation(api.masters.saveSupplier);
  const saveItem = useMutation(api.masters.saveItem);
  const saveWarehouse = useMutation(api.masters.saveWarehouse);

  const [tab, setTab] = React.useState<Tab>("pelanggan");
  const [search, setSearch] = React.useState("");

  // dialogs
  const [customerForm, setCustomerForm] = React.useState<{ open: boolean; id?: Id<"customers"> }>({ open: false });
  const [supplierForm, setSupplierForm] = React.useState<{ open: boolean; id?: Id<"suppliers"> }>({ open: false });
  const [itemForm, setItemForm] = React.useState<{ open: boolean; id?: Id<"items"> }>({ open: false });
  const [warehouseForm, setWarehouseForm] = React.useState<{ open: boolean; id?: Id<"warehouses"> }>({ open: false });

  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");

  const [supplierName, setSupplierName] = React.useState("");
  const [supplierPhone, setSupplierPhone] = React.useState("");
  const [supplierEmail, setSupplierEmail] = React.useState("");
  const [supplierAddress, setSupplierAddress] = React.useState("");

  const [itemSku, setItemSku] = React.useState("");
  const [itemName, setItemName] = React.useState("");
  const [itemCategory, setItemCategory] = React.useState("");
  const [itemUnit, setItemUnit] = React.useState("pcs");
  const [itemSalePrice, setItemSalePrice] = React.useState<number | "">("");
  const [itemCostPrice, setItemCostPrice] = React.useState<number | "">("");
  const [itemTaxRate, setItemTaxRate] = React.useState(11);
  const [itemTrackStock, setItemTrackStock] = React.useState(true);
  const [itemMinStock, setItemMinStock] = React.useState<number | "">(0);
  const [pending, setPending] = React.useState(false);

  const [warehouseName, setWarehouseName] = React.useState("");
  const [warehouseLocation, setWarehouseLocation] = React.useState("");

  const qtyById = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stock?.rows ?? []) map.set(row._id, row.qty);
    return map;
  }, [stock]);

  const filter = (list: any[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((row) =>
      [row.name, row.code, row.sku].filter(Boolean).some((value: string) => value.toLowerCase().includes(q)),
    );
  };

  const openCustomer = (row?: any) => {
    setCustomerName(row?.name ?? "");
    setCustomerPhone(row?.phone ?? "");
    setCustomerEmail(row?.email ?? "");
    setCustomerAddress(row?.address ?? "");
    setCustomerForm({ open: true, id: row?._id });
  };

  const submitCustomer = async () => {
    setPending(true);
    try {
      await saveCustomer({
        id: customerForm.id,
        name: customerName,
        phone: customerPhone || undefined,
        email: customerEmail || undefined,
        address: customerAddress || undefined,
      });
      toast.success(customerForm.id ? "Pelanggan diperbarui" : "Pelanggan ditambahkan");
      setCustomerForm({ open: false });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const openSupplier = (row?: any) => {
    setSupplierName(row?.name ?? "");
    setSupplierPhone(row?.phone ?? "");
    setSupplierEmail(row?.email ?? "");
    setSupplierAddress(row?.address ?? "");
    setSupplierForm({ open: true, id: row?._id });
  };

  const submitSupplier = async () => {
    setPending(true);
    try {
      await saveSupplier({
        id: supplierForm.id,
        name: supplierName,
        phone: supplierPhone || undefined,
        email: supplierEmail || undefined,
        address: supplierAddress || undefined,
      });
      toast.success(supplierForm.id ? "Pemasok diperbarui" : "Pemasok ditambahkan");
      setSupplierForm({ open: false });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const openItem = (row?: any) => {
    setItemSku(row?.sku ?? "");
    setItemName(row?.name ?? "");
    setItemCategory(row?.category ?? "");
    setItemUnit(row?.unit ?? "pcs");
    setItemSalePrice(row?.salePrice ?? "");
    setItemCostPrice(row?.costPrice ?? "");
    setItemTaxRate(row?.taxRate ?? 11);
    setItemTrackStock(row?.trackStock ?? true);
    setItemMinStock(row?.minStock ?? 0);
    setItemForm({ open: true, id: row?._id });
  };

  const submitItem = async () => {
    setPending(true);
    try {
      await saveItem({
        id: itemForm.id,
        sku: itemForm.id ? undefined : itemSku || undefined,
        name: itemName,
        category: itemCategory || undefined,
        unit: itemUnit,
        salePrice: Number(itemSalePrice) || 0,
        costPrice: Number(itemCostPrice) || 0,
        taxRate: Number(itemTaxRate) || 0,
        trackStock: itemTrackStock,
        minStock: Number(itemMinStock) || 0,
      });
      toast.success(itemForm.id ? "Barang diperbarui" : "Barang ditambahkan");
      setItemForm({ open: false });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const openWarehouse = (row?: any) => {
    setWarehouseName(row?.name ?? "");
    setWarehouseLocation(row?.location ?? "");
    setWarehouseForm({ open: true, id: row?._id });
  };

  const submitWarehouse = async () => {
    setPending(true);
    try {
      await saveWarehouse({
        id: warehouseForm.id,
        name: warehouseName,
        location: warehouseLocation || undefined,
      });
      toast.success(warehouseForm.id ? "Gudang diperbarui" : "Gudang ditambahkan");
      setWarehouseForm({ open: false });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (
    customers === undefined ||
    suppliers === undefined ||
    items === undefined ||
    warehouses === undefined ||
    stock === undefined
  ) {
    return <Loading label="Memuat master data…" />;
  }

  const addButtons: Record<Tab, React.ReactNode> = {
    pelanggan: (
      <Button variant="accent" size="sm" onClick={() => openCustomer()}>
        <Plus className="h-3.5 w-3.5" /> Pelanggan
      </Button>
    ),
    pemasok: (
      <Button variant="accent" size="sm" onClick={() => openSupplier()}>
        <Plus className="h-3.5 w-3.5" /> Pemasok
      </Button>
    ),
    barang: (
      <Button variant="accent" size="sm" onClick={() => openItem()}>
        <Plus className="h-3.5 w-3.5" /> Barang
      </Button>
    ),
    gudang: (
      <Button variant="accent" size="sm" onClick={() => openWarehouse()}>
        <Plus className="h-3.5 w-3.5" /> Gudang
      </Button>
    ),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Master Data"
        description="Fondasi data bisnis: pelanggan, pemasok, barang & jasa, dan gudang."
        actions={addButtons[tab]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={(value) => setTab(value as Tab)}
          tabs={[
            { value: "pelanggan", label: "Pelanggan", count: customers.length },
            { value: "pemasok", label: "Pemasok", count: suppliers.length },
            { value: "barang", label: "Barang & Jasa", count: items.length },
            { value: "gudang", label: "Gudang", count: warehouses.length },
          ]}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari…"
          className="max-w-[220px]"
        />
      </div>

      {tab === "pelanggan" ? (
        filter(customers).length === 0 ? (
          <EmptyState title="Belum ada pelanggan" icon={<Users className="h-8 w-8" />} />
        ) : (
          <Card>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Kode</TH>
                    <TH>Nama</TH>
                    <TH>Kontak</TH>
                    <TH>Alamat</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {filter(customers).map((row: any) => (
                    <TR key={row._id}>
                      <TD className="num font-semibold">{row.code}</TD>
                      <TD className="font-medium">{row.name}</TD>
                      <TD className="text-muted-foreground">
                        <p>{row.phone ?? "—"}</p>
                        <p className="text-xs">{row.email ?? ""}</p>
                      </TD>
                      <TD className="max-w-[240px] truncate text-muted-foreground">{row.address ?? "—"}</TD>
                      <TD>
                        <Button variant="ghost" size="icon" onClick={() => openCustomer(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </Card>
        )
      ) : null}

      {tab === "pemasok" ? (
        filter(suppliers).length === 0 ? (
          <EmptyState title="Belum ada pemasok" icon={<Truck className="h-8 w-8" />} />
        ) : (
          <Card>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Kode</TH>
                    <TH>Nama</TH>
                    <TH>Kontak</TH>
                    <TH>Alamat</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {filter(suppliers).map((row: any) => (
                    <TR key={row._id}>
                      <TD className="num font-semibold">{row.code}</TD>
                      <TD className="font-medium">{row.name}</TD>
                      <TD className="text-muted-foreground">
                        <p>{row.phone ?? "—"}</p>
                        <p className="text-xs">{row.email ?? ""}</p>
                      </TD>
                      <TD className="max-w-[240px] truncate text-muted-foreground">{row.address ?? "—"}</TD>
                      <TD>
                        <Button variant="ghost" size="icon" onClick={() => openSupplier(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </Card>
        )
      ) : null}

      {tab === "barang" ? (
        <Card>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>SKU</TH>
                  <TH>Nama</TH>
                  <TH>Kategori</TH>
                  <TH className="text-right">Harga Jual</TH>
                  <TH className="text-right">Harga Beli</TH>
                  <TH className="text-right">PPN</TH>
                  <TH className="text-right">Stok</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {filter(items).map((row: any) => (
                  <TR key={row._id}>
                    <TD className="num font-semibold">{row.sku}</TD>
                    <TD>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.trackStock ? `Per ${row.unit} • min ${row.minStock}` : "Jasa • tanpa stok"}
                      </p>
                    </TD>
                    <TD>
                      <Badge variant="outline">{row.category ?? "Lainnya"}</Badge>
                    </TD>
                    <TD className="num text-right">{formatIDR(row.salePrice)}</TD>
                    <TD className="num text-right text-muted-foreground">{formatIDR(row.costPrice)}</TD>
                    <TD className="num text-right">{row.taxRate}%</TD>
                    <TD className="num text-right font-bold">
                      {row.trackStock ? qtyById.get(row._id) ?? 0 : "—"}
                    </TD>
                    <TD>
                      <Button variant="ghost" size="icon" onClick={() => openItem(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Card>
      ) : null}

      {tab === "gudang" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((row: any) => (
            <Card key={row._id} className="p-5">
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-gg-lime">
                  <Warehouse className="h-5 w-5" />
                </span>
                <Button variant="ghost" size="icon" onClick={() => openWarehouse(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-3 font-bold">{row.name}</p>
              <p className="num text-xs text-muted-foreground">{row.code}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.location ?? "Tanpa lokasi"}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {/* CUSTOMER DIALOG */}
      <Dialog
        open={customerForm.open}
        onClose={() => setCustomerForm({ open: false })}
        title={customerForm.id ? "Edit Pelanggan" : "Pelanggan Baru"}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCustomerForm({ open: false })}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitCustomer} disabled={pending || !customerName.trim()}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nama">
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon">
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </Field>
          </div>
          <Field label="Alamat">
            <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
          </Field>
        </div>
      </Dialog>

      {/* SUPPLIER DIALOG */}
      <Dialog
        open={supplierForm.open}
        onClose={() => setSupplierForm({ open: false })}
        title={supplierForm.id ? "Edit Pemasok" : "Pemasok Baru"}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setSupplierForm({ open: false })}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitSupplier} disabled={pending || !supplierName.trim()}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nama">
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nama pemasok…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon">
              <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} />
            </Field>
          </div>
          <Field label="Alamat">
            <Input value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} />
          </Field>
        </div>
      </Dialog>

      {/* ITEM DIALOG */}
      <Dialog
        open={itemForm.open}
        onClose={() => setItemForm({ open: false })}
        title={itemForm.id ? "Edit Barang" : "Barang / Jasa Baru"}
        description="Kosongkan SKU untuk penomoran otomatis."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setItemForm({ open: false })}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitItem} disabled={pending || !itemName.trim()}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <Input
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                disabled={!!itemForm.id}
                placeholder="Otomatis jika kosong"
              />
            </Field>
            <Field label="Kategori">
              <Input value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} placeholder="Minuman…" />
            </Field>
          </div>
          <Field label="Nama Barang / Jasa">
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Satuan">
              <Input value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} placeholder="pcs / kg / job" />
            </Field>
            <Field label="PPN (%)">
              <Input
                type="number"
                min={0}
                value={itemTaxRate}
                onChange={(e) => setItemTaxRate(Number(e.target.value) || 0)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Harga Jual">
              <Input
                type="number"
                min={0}
                value={itemSalePrice}
                onChange={(e) => (e.target.value === "" ? setItemSalePrice("") : setItemSalePrice(Number(e.target.value)))}
              />
            </Field>
            <Field label="Harga Beli (biaya)">
              <Input
                type="number"
                min={0}
                value={itemCostPrice}
                onChange={(e) => (e.target.value === "" ? setItemCostPrice("") : setItemCostPrice(Number(e.target.value)))}
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={itemTrackStock}
              onChange={(e) => setItemTrackStock(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <Package className="h-4 w-4 text-muted-foreground" />
            Lacak stok (hilangkan untuk barang jasa)
          </label>
          {itemTrackStock ? (
            <Field label="Stok Minimum (peringatan)">
              <Input
                type="number"
                min={0}
                value={itemMinStock}
                onChange={(e) => setItemMinStock(Number(e.target.value) || 0)}
              />
            </Field>
          ) : null}
        </div>
      </Dialog>

      {/* WAREHOUSE DIALOG */}
      <Dialog
        open={warehouseForm.open}
        onClose={() => setWarehouseForm({ open: false })}
        title={warehouseForm.id ? "Edit Gudang" : "Gudang Baru"}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setWarehouseForm({ open: false })}>
              Batal
            </Button>
            <Button variant="accent" onClick={submitWarehouse} disabled={pending || !warehouseName.trim()}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nama Gudang">
            <Input value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} placeholder="Gudang Cabang…" />
          </Field>
          <Field label="Lokasi">
            <Input value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} placeholder="Kota / alamat" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
