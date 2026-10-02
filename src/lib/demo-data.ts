/**
 * Dataset contoh untuk Mode Demo Tamu.
 *
 * Semua modul demo (dashboard, kasir, penjualan, laporan, buku besar) diturunkan
 * dari satu sumber data di sini lewat `buildLedger()`, sehingga angka antar
 * modul selalu konsisten: penjualan kasir = penjualan di laporan = kas masuk.
 *
 * Tidak ada panggilan Convex di file ini — murni data lokal untuk pratinjau tamu.
 */

export type DemoItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  taxRate: number;
};

export type DemoCustomer = { id: string; code: string; name: string; city: string; phone: string };
export type DemoSupplier = { id: string; code: string; name: string; city: string; phone: string };
export type DemoWarehouse = { id: string; name: string };

export type DemoSaleLine = { itemId: string; qty: number; price: number; discount: number };
export type DemoSale = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  customerId?: string;
  customerName: string;
  lines: DemoSaleLine[];
  paid: number;
  method: "cash" | "qris" | "transfer";
  isPos: boolean;
};

export type DemoBillLine = { itemId: string; qty: number; price: number; expense?: boolean };
export type DemoBill = {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  supplierId: string;
  supplierName: string;
  lines: DemoBillLine[];
  paid: number;
};

export type DemoCashTx = {
  id: string;
  number: string;
  date: string;
  direction: "in" | "out" | "transfer";
  amount: number;
  account: "cash" | "bank";
  /** Kode akun lawan: beban untuk pengeluaran, pendapatan untuk kas masuk. */
  contra?: string;
  memo: string;
};

export type DemoAsset = {
  code: string;
  name: string;
  category: string;
  acquisitionDate: string;
  cost: number;
  salvage: number;
  lifeMonths: number;
  method: "straight_line" | "declining_balance";
  depreciatedMonths: number;
  disposed?: { date: string; proceeds: number };
};

export type DemoAccount = { code: string; name: string; type: string };

export type DemoJournalLine = {
  date: string;
  sourceType: string;
  sourceNumber: string;
  memo: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
};

export const DEMO_WAREHOUSES: DemoWarehouse[] = [
  { id: "WH1", name: "Gudang Utama" },
  { id: "WH2", name: "Gudang Toko" },
];

export const DEMO_ITEMS: DemoItem[] = [
  { id: "IT1", sku: "BRG-001", name: "Kopi Arabika 250g", category: "Minuman", unit: "pack", price: 45000, cost: 32000, stock: 300, minStock: 60, taxRate: 11 },
  { id: "IT2", sku: "BRG-002", name: "Teh Celup Melati", category: "Minuman", unit: "box", price: 12000, cost: 8500, stock: 500, minStock: 100, taxRate: 0 },
  { id: "IT3", sku: "BRG-003", name: "Susu UHT 1L", category: "Minuman", unit: "pcs", price: 19000, cost: 15500, stock: 320, minStock: 80, taxRate: 11 },
  { id: "IT4", sku: "BRG-004", name: "Air Mineral 600ml", category: "Minuman", unit: "btl", price: 5000, cost: 3200, stock: 900, minStock: 200, taxRate: 0 },
  { id: "IT5", sku: "BRG-005", name: "Roti Tawar", category: "Bakery", unit: "pcs", price: 16000, cost: 11000, stock: 200, minStock: 50, taxRate: 0 },
  { id: "IT6", sku: "BRG-006", name: "Biskuit Kelapa", category: "Snack", unit: "pak", price: 9000, cost: 6000, stock: 420, minStock: 100, taxRate: 0 },
  { id: "IT7", sku: "BRG-007", name: "Kopi Susu Botol", category: "Minuman", unit: "btl", price: 18000, cost: 12500, stock: 260, minStock: 60, taxRate: 11 },
  { id: "IT8", sku: "BRG-008", name: "Gula Kristal 1kg", category: "Buatan", unit: "kg", price: 15500, cost: 14000, stock: 160, minStock: 40, taxRate: 0 },
  { id: "IT9", sku: "BRG-009", name: "Minyak Goreng 1L", category: "Buatan", unit: "btl", price: 36000, cost: 33000, stock: 130, minStock: 30, taxRate: 0 },
  { id: "IT10", sku: "BRG-010", name: "Beras Premium 5kg", category: "Buatan", unit: "sak", price: 78000, cost: 72000, stock: 80, minStock: 20, taxRate: 11 },
  { id: "IT11", sku: "BRG-011", name: "Sabun Cair 250ml", category: "Perawatan", unit: "btl", price: 22000, cost: 16500, stock: 200, minStock: 50, taxRate: 0 },
  { id: "IT12", sku: "BRG-012", name: "Kertas Thermal 80mm", category: "Perlengkapan", unit: "roll", price: 25000, cost: 19000, stock: 30, minStock: 12, taxRate: 0 },
];

export const demoItemById = new Map(DEMO_ITEMS.map((item) => [item.id, item]));

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  { id: "C1", code: "CUST-001", name: "Toko Maju Jaya", city: "Bandung", phone: "0812-1110-2233" },
  { id: "C2", code: "CUST-002", name: "Warung Bunda Sari", city: "Bandung", phone: "0813-2210-8899" },
  { id: "C3", code: "CUST-003", name: "Kantor Seri Print", city: "Cimahi", phone: "022-6655-1234" },
  { id: "C4", code: "CUST-004", name: "Cafe Kita", city: "Bandung", phone: "0857-3320-4411" },
  { id: "C5", code: "CUST-005", name: "Ruko Andalan", city: "Sumedang", phone: "0819-4430-5566" },
  { id: "C6", code: "CUST-006", name: "Toko Berkah Mandiri", city: "Garut", phone: "0821-5540-6677" },
];

export const DEMO_SUPPLIERS: DemoSupplier[] = [
  { id: "S1", code: "SUPP-001", name: "PT Sumber Kopi Nusantara", city: "Bandung", phone: "022-7712-3344" },
  { id: "S2", code: "SUPP-002", name: "CV Makmur Distribusi", city: "Jakarta", phone: "021-5566-7788" },
  { id: "S3", code: "SUPP-003", name: "UD Barokah Food", city: "Bandung", phone: "0812-8890-1122" },
  { id: "S4", code: "SUPP-004", name: "PT Sinar Kemasan", city: "Bekasi", phone: "021-8877-6655" },
];

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { code: "1-1000", name: "Kas", type: "asset" },
  { code: "1-1100", name: "Bank", type: "asset" },
  { code: "1-1200", name: "Piutang Usaha", type: "asset" },
  { code: "1-1300", name: "Persediaan", type: "asset" },
  { code: "1-1500", name: "Aset Tetap", type: "asset" },
  { code: "1-1600", name: "Akumulasi Penyusutan", type: "asset" },
  { code: "1-1700", name: "PPN Masukan", type: "asset" },
  { code: "2-1000", name: "Utang Usaha", type: "liability" },
  { code: "2-1100", name: "PPN Keluaran", type: "liability" },
  { code: "3-1000", name: "Modal", type: "equity" },
  { code: "4-1000", name: "Pendapatan Penjualan", type: "revenue" },
  { code: "4-2000", name: "Pendapatan Lain", type: "revenue" },
  { code: "5-1000", name: "Harga Pokok Penjualan", type: "expense" },
  { code: "5-1100", name: "Beban Gaji", type: "expense" },
  { code: "5-1200", name: "Beban Sewa", type: "expense" },
  { code: "5-1300", name: "Beban Listrik & Internet", type: "expense" },
  { code: "5-1400", name: "Beban Transportasi", type: "expense" },
  { code: "5-2000", name: "Beban Penyusutan", type: "expense" },
  { code: "5-2100", name: "Rugi Penjualan Aset", type: "expense" },
];

/** Tanggal relatif terhadap hari ini — menjaga demo aging tetap relevan kapan pun dilihat. */
function shiftDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const RAW_SALES: DemoSale[] = [
  { id: "SL1", number: "INV-0001", date: "2026-02-03", dueDate: "2026-03-05", customerId: "C1", customerName: "Toko Maju Jaya", lines: [{ itemId: "IT1", qty: 60, price: 45000, discount: 0 }, { itemId: "IT7", qty: 120, price: 18000, discount: 0 }], paid: 0, method: "transfer", isPos: false },
  { id: "SL2", number: "INV-0002", date: "2026-03-11", dueDate: "2026-04-10", customerId: "C2", customerName: "Warung Bunda Sari", lines: [{ itemId: "IT3", qty: 60, price: 19000, discount: 0 }, { itemId: "IT4", qty: 120, price: 5000, discount: 0 }], paid: 1000000, method: "transfer", isPos: false },
  { id: "SL3", number: "INV-0003", date: "2026-04-07", dueDate: "2026-05-07", customerId: "C3", customerName: "Kantor Seri Print", lines: [{ itemId: "IT12", qty: 160, price: 25000, discount: 0 }], paid: 0, method: "transfer", isPos: false },
  { id: "SL4", number: "POS-0001", date: "2026-05-19", customerName: "Pelanggan Umum", lines: [{ itemId: "IT7", qty: 3, price: 18000, discount: 0 }, { itemId: "IT5", qty: 2, price: 16000, discount: 0 }], paid: 91940, method: "qris", isPos: true },
  { id: "SL5", number: "INV-0004", date: "2026-06-02", dueDate: "2026-07-02", customerId: "C4", customerName: "Cafe Kita", lines: [{ itemId: "IT1", qty: 80, price: 45000, discount: 0 }, { itemId: "IT3", qty: 200, price: 19000, discount: 0 }, { itemId: "IT2", qty: 100, price: 12000, discount: 0 }], paid: 0, method: "transfer", isPos: false },
  { id: "SL6", number: "POS-0002", date: "2026-06-21", customerName: "Pelanggan Umum", lines: [{ itemId: "IT4", qty: 12, price: 5000, discount: 1000 }], paid: 59000, method: "cash", isPos: true },
  { id: "SL7", number: "INV-0005", date: "2026-07-14", dueDate: "2026-08-13", customerId: "C5", customerName: "Ruko Andalan", lines: [{ itemId: "IT10", qty: 12, price: 78000, discount: 0 }, { itemId: "IT8", qty: 20, price: 15500, discount: 0 }], paid: 500000, method: "transfer", isPos: false },
  { id: "SL8", number: "POS-0003", date: "2026-08-08", customerName: "Pelanggan Umum", lines: [{ itemId: "IT6", qty: 8, price: 9000, discount: 0 }, { itemId: "IT4", qty: 6, price: 5000, discount: 0 }], paid: 102000, method: "qris", isPos: true },
  { id: "SL9", number: "INV-0006", date: "2026-09-01", dueDate: "2026-10-01", customerId: "C6", customerName: "Toko Berkah Mandiri", lines: [{ itemId: "IT9", qty: 48, price: 36000, discount: 0 }, { itemId: "IT11", qty: 40, price: 22000, discount: 0 }], paid: 0, method: "transfer", isPos: false },
  { id: "SL10", number: "POS-0004", date: "2026-09-18", customerName: "Pelanggan Umum", lines: [{ itemId: "IT5", qty: 5, price: 16000, discount: 0 }, { itemId: "IT7", qty: 3, price: 18000, discount: 0 }], paid: 139940, method: "cash", isPos: true },
  { id: "SL11", number: "INV-0007", date: shiftDays(-26), dueDate: shiftDays(-11), customerId: "C2", customerName: "Warung Bunda Sari", lines: [{ itemId: "IT3", qty: 72, price: 19000, discount: 0 }, { itemId: "IT5", qty: 36, price: 16000, discount: 0 }], paid: 0, method: "transfer", isPos: false },
  { id: "SL12", number: "INV-0008", date: shiftDays(-47), dueDate: shiftDays(-22), customerId: "C4", customerName: "Cafe Kita", lines: [{ itemId: "IT1", qty: 30, price: 45000, discount: 0 }, { itemId: "IT2", qty: 50, price: 12000, discount: 0 }], paid: 0, method: "transfer", isPos: false },
  { id: "SL13", number: "POS-0005", date: shiftDays(-6), customerName: "Pelanggan Umum", lines: [{ itemId: "IT4", qty: 8, price: 5000, discount: 0 }, { itemId: "IT5", qty: 3, price: 16000, discount: 0 }], paid: 88000, method: "qris", isPos: true },
];

/** Transaksi kasir selalu dibayar penuh — dinormalisasi agar tidak ada sisa piutang. */
export const DEMO_SALES: DemoSale[] = RAW_SALES.map((sale) =>
  sale.isPos ? { ...sale, paid: saleTotals(sale).total } : sale,
);

export const DEMO_BILLS: DemoBill[] = [
  { id: "BL1", number: "BILL-0001", date: "2026-02-05", dueDate: "2026-03-07", supplierId: "S1", supplierName: "PT Sumber Kopi Nusantara", lines: [{ itemId: "IT1", qty: 200, price: 32000 }, { itemId: "IT7", qty: 300, price: 12500 }], paid: 11266500 },
  { id: "BL2", number: "BILL-0002", date: "2026-03-14", dueDate: "2026-04-13", supplierId: "S2", supplierName: "CV Makmur Distribusi", lines: [{ itemId: "IT3", qty: 600, price: 15500 }, { itemId: "IT4", qty: 1200, price: 3200 }], paid: 14163000 },
  { id: "BL3", number: "BILL-0003", date: "2026-04-19", dueDate: "2026-05-19", supplierId: "S3", supplierName: "UD Barokah Food", lines: [{ itemId: "IT5", qty: 400, price: 11000 }, { itemId: "IT6", qty: 600, price: 6000 }], paid: 0 },
  { id: "BL4", number: "BILL-0004", date: "2026-06-10", dueDate: "2026-07-10", supplierId: "S4", supplierName: "PT Sinar Kemasan", lines: [{ itemId: "IT12", qty: 240, price: 19000 }, { itemId: "IT11", qty: 160, price: 16500 }], paid: 7200000 },
  { id: "BL5", number: "BILL-0005", date: "2026-07-21", dueDate: "2026-08-20", supplierId: "S2", supplierName: "CV Makmur Distribusi", lines: [{ itemId: "IT8", qty: 200, price: 14000 }, { itemId: "IT9", qty: 120, price: 33000 }], paid: 6760000 },
  { id: "BL6", number: "BILL-0006", date: "2026-08-25", dueDate: "2026-09-24", supplierId: "S1", supplierName: "PT Sumber Kopi Nusantara", lines: [{ itemId: "IT1", qty: 160, price: 33000 }, { itemId: "IT2", qty: 400, price: 8600 }], paid: 6500000 },
];

export const DEMO_CASH: DemoCashTx[] = [
  { id: "CS3", number: "CB-0003", date: "2026-02-10", direction: "out", amount: 900000, account: "cash", contra: "5-1100", memo: "Gaji karyawan Februari" },
  { id: "CS4", number: "CB-0004", date: "2026-03-05", direction: "out", amount: 800000, account: "bank", contra: "5-1200", memo: "Sewa kios Maret" },
  { id: "CS5", number: "CB-0005", date: "2026-04-10", direction: "out", amount: 450000, account: "bank", contra: "5-1300", memo: "Listrik & internet" },
  { id: "CS6", number: "CB-0006", date: "2026-05-20", direction: "out", amount: 250000, account: "cash", contra: "5-1400", memo: "Ongkos kirim pesanan" },
  { id: "CS7", number: "CB-0007", date: "2026-07-02", direction: "in", amount: 1200000, account: "cash", contra: "4-2000", memo: "Sewa rak display" },
  { id: "CS8", number: "CB-0008", date: "2026-09-05", direction: "out", amount: 900000, account: "cash", contra: "5-1100", memo: "Gaji karyawan September" },
];

export const DEMO_ASSETS: DemoAsset[] = [
  { code: "FA-0001", name: "Freezer Display 300L", category: "Peralatan", acquisitionDate: "2026-03-12", cost: 8500000, salvage: 1000000, lifeMonths: 48, method: "straight_line", depreciatedMonths: 5 },
  { code: "FA-0002", name: "Rak display", category: "Peralatan", acquisitionDate: "2026-05-08", cost: 4500000, salvage: 500000, lifeMonths: 36, method: "straight_line", depreciatedMonths: 3 },
  { code: "FA-0003", name: "Laptop Kasir", category: "Elektronik", acquisitionDate: "2026-02-20", cost: 3500000, salvage: 0, lifeMonths: 24, method: "declining_balance", depreciatedMonths: 3, disposed: { date: "2026-09-12", proceeds: 2200000 } },
];

const CURRENT_STOCK_VALUE = DEMO_ITEMS.reduce((sum, item) => sum + item.stock * item.cost, 0);
const PURCHASED_STOCK_VALUE = DEMO_BILLS.reduce((sum, bill) => sum + billTotals(bill).stock, 0);
const SOLD_COGS_VALUE = DEMO_SALES.reduce((sum, sale) => sum + saleTotals(sale).cogs, 0);
/**
 * Saldo persediaan awal dihitung mundur agar akun 1-1300 pada jurnal selalu sama
 * dengan nilai kartu stok yang tampil di modul Persediaan.
 */
const OPENING_STOCK_VALUE = CURRENT_STOCK_VALUE - PURCHASED_STOCK_VALUE + SOLD_COGS_VALUE;

/* ------------------------------------------------------------------ */
/* Perhitungan dokumen                                                 */
/* ------------------------------------------------------------------ */

export type SaleTotals = { subtotal: number; tax: number; total: number; cogs: number; qty: number };

export function saleTotals(sale: DemoSale): SaleTotals {
  let subtotal = 0;
  let tax = 0;
  let cogs = 0;
  let qty = 0;
  for (const line of sale.lines) {
    const item = demoItemById.get(line.itemId);
    const amount = line.qty * line.price - line.discount;
    subtotal += amount;
    tax += Math.round((amount * (item?.taxRate ?? 0)) / 100);
    cogs += line.qty * (item?.cost ?? 0);
    qty += line.qty;
  }
  return { subtotal, tax, total: subtotal + tax, cogs, qty };
}

export type BillTotals = { stock: number; expense: number; tax: number; total: number };

export function billTotals(bill: DemoBill): BillTotals {
  let stock = 0;
  let expense = 0;
  let tax = 0;
  for (const line of bill.lines) {
    const item = demoItemById.get(line.itemId);
    const amount = line.qty * line.price;
    if (line.expense || !item) expense += amount;
    else stock += amount;
    tax += Math.round((amount * (item?.taxRate ?? 0)) / 100);
  }
  return { stock, expense, tax, total: stock + expense + tax };
}

/* ------------------------------------------------------------------ */
/* Ledger                                                               */
/* ------------------------------------------------------------------ */

export type AgingRow = { party: string; d0_14: number; d15_30: number; d30plus: number; total: number };

export type DemoLedger = {
  journal: DemoJournalLine[];
  sales: DemoSale[];
  bills: DemoBill[];
  stockValue: number;
  stockQty: number;
  salesRevenue: number;
  otherIncome: number;
  totalRevenue: number;
  totalCogs: number;
  totalOpex: number;
  grossProfit: number;
  netProfit: number;
  totalSales: number;
  totalPurchases: number;
  cashBalance: number;
  bankBalance: number;
  receivable: number;
  payable: number;
  taxOutput: number;
  taxInput: number;
  taxPayable: number;
  fixedAssetCost: number;
  accumulatedDepreciation: number;
  bookValue: number;
  trialBalance: Array<DemoAccount & { debit: number; credit: number; balance: number }>;
  arAging: AgingRow[];
  apAging: AgingRow[];
  monthlySales: Array<{ month: string; label: string; value: number; cogs: number }>;
  topProducts: Array<{ itemId: string; name: string; qty: number; value: number }>;
};

function daysBetween(from: string, to: Date) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.max(Math.round((end - start) / 86400000), 0);
}

function bucketOf(days: number): keyof Pick<AgingRow, "d0_14" | "d15_30" | "d30plus"> {
  if (days <= 14) return "d0_14";
  if (days <= 30) return "d15_30";
  return "d30plus";
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/**
 * Bangun jurnal double-entry dari seluruh data contoh + transaksi kasir tamu.
 * `guestSales` adalah transaksi yang dibuat sendiri tamu lewat kasir demo.
 */
export function buildLedger(guestSales: DemoSale[] = []): DemoLedger {
  const accountByCode = new Map(DEMO_ACCOUNTS.map((account) => [account.code, account]));
  const journal: DemoJournalLine[] = [];

  const push = (
    date: string,
    sourceType: string,
    sourceNumber: string,
    memo: string,
    code: string,
    debit: number,
    credit: number,
  ) => {
    const account = accountByCode.get(code);
    if (!account) throw new Error(`Akun demo ${code} tidak ditemukan`);
    if (debit === 0 && credit === 0) return;
    journal.push({
      date,
      sourceType,
      sourceNumber,
      memo,
      code,
      name: account.name,
      type: account.type,
      debit,
      credit,
    });
  };

  // 1. Saldo awal
  push("2026-01-15", "OPENING", "SALDO-AWAL", "Saldo awal kas", "1-1000", 25000000, 0);
  push("2026-01-15", "OPENING", "SALDO-AWAL", "Saldo awal bank", "1-1100", 150000000, 0);
  push("2026-01-15", "OPENING", "SALDO-AWAL", "Persediaan awal", "1-1300", OPENING_STOCK_VALUE, 0);
  push("2026-01-15", "OPENING", "SALDO-AWAL", "Modal pemilik", "3-1000", 0, 25000000 + 150000000 + OPENING_STOCK_VALUE);

  const sales = [...DEMO_SALES, ...guestSales].sort((a, b) => a.date.localeCompare(b.date));
  const bills = [...DEMO_BILLS].sort((a, b) => a.date.localeCompare(b.date));

  // 2. Penjualan (POS langsung masuk kas; faktur lewat piutang)
  for (const sale of sales) {
    const totals = saleTotals(sale);
    const cashCode = sale.method === "cash" || sale.method === "qris" ? "1-1000" : "1-1100";
    const payLabel = sale.method === "qris" ? "QRIS" : sale.method === "cash" ? "Tunai" : "Transfer";

    if (sale.isPos) {
      push(sale.date, "POS", sale.number, `Kasir ${sale.number} — ${sale.customerName}`, cashCode, totals.total, 0);
    } else {
      push(sale.date, "SALES_INVOICE", sale.number, `Faktur penjualan ${sale.number} — ${sale.customerName}`, "1-1200", totals.total, 0);
    }
    push(sale.date, "SALES_INVOICE", sale.number, `Faktur penjualan ${sale.number}`, "4-1000", 0, totals.subtotal);
    push(sale.date, "SALES_INVOICE", sale.number, "PPN keluaran", "2-1100", 0, totals.tax);
    push(sale.date, "SALES_INVOICE", sale.number, "Harga pokok penjualan", "5-1000", totals.cogs, 0);
    push(sale.date, "SALES_INVOICE", sale.number, "Pengurangan persediaan", "1-1300", 0, totals.cogs);

    if (!sale.isPos && sale.paid > 0) {
      push(sale.date, "RECEIPT", sale.number, `Penerimaan ${sale.number} — ${sale.customerName} (${payLabel})`, cashCode, sale.paid, 0);
      push(sale.date, "RECEIPT", sale.number, `Penerimaan ${sale.number}`, "1-1200", 0, sale.paid);
    }
  }

  // 3. Pembelian
  for (const bill of bills) {
    const totals = billTotals(bill);
    push(bill.date, "PURCHASE_BILL", bill.number, `Faktur pembelian ${bill.number} — ${bill.supplierName}`, "1-1300", totals.stock, 0);
    push(bill.date, "PURCHASE_BILL", bill.number, `Faktur pembelian ${bill.number}`, "5-1400", totals.expense, 0);
    push(bill.date, "PURCHASE_BILL", bill.number, "PPN masukan", "1-1700", totals.tax, 0);
    push(bill.date, "PURCHASE_BILL", bill.number, `Faktur pembelian ${bill.number} — ${bill.supplierName}`, "2-1000", 0, totals.total);
    if (bill.paid > 0) {
      push(bill.date, "PAYMENT", bill.number, `Pembayaran ${bill.number} — ${bill.supplierName}`, "2-1000", bill.paid, 0);
      push(bill.date, "PAYMENT", bill.number, `Pembayaran ${bill.number}`, "1-1100", 0, bill.paid);
    }
  }

  // 4. Kas & bank
  for (const tx of DEMO_CASH) {
    const accountCode = tx.account === "cash" ? "1-1000" : "1-1100";
    const contraCode = tx.contra ?? (tx.direction === "in" ? "4-2000" : "5-1100");
    if (tx.direction === "in") {
      push(tx.date, "CASH", tx.number, `${tx.number} — ${tx.memo}`, accountCode, tx.amount, 0);
      push(tx.date, "CASH", tx.number, `${tx.number} — ${tx.memo}`, contraCode, 0, tx.amount);
    } else {
      push(tx.date, "CASH", tx.number, `${tx.number} — ${tx.memo}`, contraCode, tx.amount, 0);
      push(tx.date, "CASH", tx.number, `${tx.number} — ${tx.memo}`, accountCode, 0, tx.amount);
    }
  }

  // 5. Aset tetap: perolehan, penyusutan, dan penjualan aset
  for (const asset of DEMO_ASSETS) {
    push(asset.acquisitionDate, "ASSET_ACQUISITION", asset.code, `Perolehan aset tetap [${asset.code}] ${asset.name}`, "1-1500", asset.cost, 0);
    push(asset.acquisitionDate, "ASSET_ACQUISITION", asset.code, `Perolehan aset tetap [${asset.code}] ${asset.name}`, "1-1100", 0, asset.cost);

    const floor = Math.max(asset.salvage, 0);
    for (let m = 0; m < asset.depreciatedMonths; m += 1) {
      const accumulatedSoFar = accumulatedFor(asset, m);
      const bookValue = asset.cost - accumulatedSoFar;
      if (bookValue <= floor) break;
      const monthly =
        asset.method === "declining_balance"
          ? Math.min(Math.round(bookValue * Math.min(2 / asset.lifeMonths, 1)), bookValue - floor)
          : Math.min(Math.round((asset.cost - asset.salvage) / asset.lifeMonths), bookValue - floor);
      if (monthly <= 0) break;
      const monthIndex = (Number(asset.acquisitionDate.slice(5, 7)) + m) % 12;
      const year = Number(asset.acquisitionDate.slice(0, 4)) + Math.floor((Number(asset.acquisitionDate.slice(5, 7)) + m - 1) / 12);
      const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-28`;
      push(date, "DEPRECIATION", `DEP-${asset.code}-${m + 1}`, `Penyusutan ${asset.name}`, "5-2000", monthly, 0);
      push(date, "DEPRECIATION", `DEP-${asset.code}-${m + 1}`, `Penyusutan ${asset.name}`, "1-1600", 0, monthly);
    }

    if (asset.disposed) {
      const accumulated = accumulatedFor(asset, asset.depreciatedMonths);
      const bookValue = asset.cost - accumulated;
      const proceeds = asset.disposed.proceeds;
      push(asset.disposed.date, "ASSET_DISPOSAL", asset.code, `Penjualan aset [${asset.code}] ${asset.name}`, "1-1600", accumulated, 0);
      push(asset.disposed.date, "ASSET_DISPOSAL", asset.code, `Hasil penjualan aset [${asset.code}]`, "1-1100", proceeds, 0);
      const gap = bookValue - proceeds;
      if (gap > 0) push(asset.disposed.date, "ASSET_DISPOSAL", asset.code, `Rugi penjualan aset [${asset.code}]`, "5-2100", gap, 0);
      if (gap < 0) push(asset.disposed.date, "ASSET_DISPOSAL", asset.code, `Laba penjualan aset [${asset.code}]`, "4-2000", 0, Math.abs(gap));
      push(asset.disposed.date, "ASSET_DISPOSAL", asset.code, `Aset keluar [${asset.code}]`, "1-1500", 0, asset.cost);
    }
  }

  // --- Agregasi -----------------------------------------------------
  const balances = new Map<string, number>();
  for (const line of journal) {
    balances.set(line.code, (balances.get(line.code) ?? 0) + line.debit - line.credit);
  }
  const balanceOf = (code: string) => balances.get(code) ?? 0;

  const trialBalance = DEMO_ACCOUNTS.map((account) => {
    const debit = journal.filter((l) => l.code === account.code).reduce((s, l) => s + l.debit, 0);
    const credit = journal.filter((l) => l.code === account.code).reduce((s, l) => s + l.credit, 0);
    return { ...account, debit, credit, balance: debit - credit };
  });

  const salesRevenue = balanceOf("4-1000") * -1;
  const otherIncome = balanceOf("4-2000") * -1;
  const totalRevenue = salesRevenue + otherIncome;
  const totalCogs = balanceOf("5-1000");
  const totalOpex =
    balanceOf("5-1100") + balanceOf("5-1200") + balanceOf("5-1300") +
    balanceOf("5-1400") + balanceOf("5-2000") + balanceOf("5-2100");
  const grossProfit = totalRevenue - totalCogs;

  const today = new Date();

  const arMap = new Map<string, AgingRow>();
  for (const sale of sales) {
    if (sale.isPos) continue;
    const outstanding = saleTotals(sale).total - sale.paid;
    if (outstanding <= 0) continue;
    const row = arMap.get(sale.customerName) ?? {
      party: sale.customerName,
      d0_14: 0,
      d15_30: 0,
      d30plus: 0,
      total: 0,
    };
    row[bucketOf(daysBetween(sale.dueDate ?? sale.date, today))] += outstanding;
    row.total += outstanding;
    arMap.set(sale.customerName, row);
  }

  const apMap = new Map<string, AgingRow>();
  for (const bill of bills) {
    const outstanding = billTotals(bill).total - bill.paid;
    if (outstanding <= 0) continue;
    const row = apMap.get(bill.supplierName) ?? {
      party: bill.supplierName,
      d0_14: 0,
      d15_30: 0,
      d30plus: 0,
      total: 0,
    };
    row[bucketOf(daysBetween(bill.dueDate ?? bill.date, today))] += outstanding;
    row.total += outstanding;
    apMap.set(bill.supplierName, row);
  }

  const monthlyMap = new Map<string, { value: number; cogs: number }>();
  for (const sale of sales) {
    const month = sale.date.slice(0, 7);
    const entry = monthlyMap.get(month) ?? { value: 0, cogs: 0 };
    const totals = saleTotals(sale);
    entry.value += totals.total;
    entry.cogs += totals.cogs;
    monthlyMap.set(month, entry);
  }
  const monthlySales = Array.from(monthlyMap.entries())
    .map(([month, entry]) => ({
      month,
      label: `${MONTH_LABELS[Number(month.slice(5, 7)) - 1]} ${month.slice(2, 4)}`,
      value: entry.value,
      cogs: entry.cogs,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const productMap = new Map<string, { name: string; qty: number; value: number }>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      const item = demoItemById.get(line.itemId);
      if (!item) continue;
      const entry = productMap.get(line.itemId) ?? { name: item.name, qty: 0, value: 0 };
      entry.qty += line.qty;
      entry.value += line.qty * line.price - line.discount;
      productMap.set(line.itemId, entry);
    }
  }

  const disposedCodes = new Set(DEMO_ASSETS.filter((a) => a.disposed).map((a) => a.code));
  const guestCogs = guestSales.reduce((sum, sale) => sum + saleTotals(sale).cogs, 0);
  const guestQty = guestSales.reduce((sum, sale) => sum + saleTotals(sale).qty, 0);

  return {
    journal: journal.sort((a, b) => b.date.localeCompare(a.date)),
    sales,
    bills,
    stockValue: CURRENT_STOCK_VALUE - guestCogs,
    stockQty: DEMO_ITEMS.reduce((sum, item) => sum + item.stock, 0) - guestQty,
    salesRevenue,
    otherIncome,
    totalRevenue,
    totalCogs,
    totalOpex,
    grossProfit,
    netProfit: grossProfit - totalOpex,
    totalSales: sales.reduce((sum, sale) => sum + saleTotals(sale).total, 0),
    totalPurchases: bills.reduce((sum, bill) => sum + billTotals(bill).total, 0),
    cashBalance: balanceOf("1-1000"),
    bankBalance: balanceOf("1-1100"),
    receivable: balanceOf("1-1200"),
    // akun liabilitas normalnya saldo kredit — balik tandanya agar tampil positif
    payable: -balanceOf("2-1000"),
    taxOutput: -balanceOf("2-1100"),
    taxInput: balanceOf("1-1700"),
    taxPayable: -balanceOf("2-1100") - balanceOf("1-1700"),
    fixedAssetCost: DEMO_ASSETS.filter((a) => !disposedCodes.has(a.code)).reduce((sum, a) => sum + a.cost, 0),
    accumulatedDepreciation: DEMO_ASSETS.filter((a) => !disposedCodes.has(a.code)).reduce(
      (sum, a) => sum + accumulatedFor(a, a.depreciatedMonths),
      0,
    ),
    bookValue: DEMO_ASSETS.filter((a) => !disposedCodes.has(a.code)).reduce(
      (sum, a) => sum + a.cost - accumulatedFor(a, a.depreciatedMonths),
      0,
    ),
    trialBalance,
    arAging: Array.from(arMap.values()).sort((a, b) => b.total - a.total),
    apAging: Array.from(apMap.values()).sort((a, b) => b.total - a.total),
    monthlySales,
    topProducts: Array.from(productMap.entries())
      .map(([itemId, entry]) => ({ itemId, ...entry }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
  };
}

/** Akumulasi penyusutan n bulan pertama untuk sebuah aset. */
export function accumulatedFor(asset: DemoAsset, months: number) {
  const floor = Math.max(asset.salvage, 0);
  let accumulated = 0;
  for (let m = 0; m < months; m += 1) {
    const bookValue = asset.cost - accumulated;
    if (bookValue <= floor) break;
    const monthly =
      asset.method === "declining_balance"
        ? Math.min(Math.round(bookValue * Math.min(2 / asset.lifeMonths, 1)), bookValue - floor)
        : Math.min(Math.round((asset.cost - asset.salvage) / asset.lifeMonths), bookValue - floor);
    if (monthly <= 0) break;
    accumulated += monthly;
  }
  return accumulated;
}

/** Saldo stok setelah transaksi kasir tamu. */
export function stockAfterGuestSales(guestSales: DemoSale[]) {
  const stock = new Map(DEMO_ITEMS.map((item) => [item.id, item.stock]));
  for (const sale of guestSales) {
    for (const line of sale.lines) {
      stock.set(line.itemId, (stock.get(line.itemId) ?? 0) - line.qty);
    }
  }
  return stock;
}