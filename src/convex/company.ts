import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { applyStockMove, logAudit, postJournal } from "./lib/posting";

const COA_SEED: Array<{
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  kind: string;
}> = [
  { code: "1-1000", name: "Kas", type: "asset", kind: "cash" },
  { code: "1-1010", name: "Bank", type: "asset", kind: "bank" },
  { code: "1-1100", name: "Piutang Usaha", type: "asset", kind: "receivable" },
  { code: "1-1200", name: "Persediaan Barang", type: "asset", kind: "inventory" },
  { code: "1-1300", name: "PPN Masukan", type: "asset", kind: "tax_in" },
  { code: "1-1500", name: "Aset Tetap", type: "asset", kind: "fixed_asset" },
  { code: "1-1600", name: "Akumulasi Penyusutan", type: "asset", kind: "accum_dep" },
  { code: "2-2000", name: "Utang Usaha", type: "liability", kind: "payable" },
  { code: "2-2100", name: "PPN Keluaran", type: "liability", kind: "tax_out" },
  { code: "3-3000", name: "Modal Disetor", type: "equity", kind: "equity" },
  { code: "4-4000", name: "Pendapatan Penjualan", type: "revenue", kind: "sales" },
  { code: "4-4900", name: "Pendapatan Lain-lain", type: "revenue", kind: "other_income" },
  { code: "5-5000", name: "Harga Pokok Penjualan", type: "expense", kind: "cogs" },
  { code: "5-5100", name: "Beban Gaji", type: "expense", kind: "other" },
  { code: "5-5200", name: "Beban Listrik & Air", type: "expense", kind: "other" },
  { code: "5-5300", name: "Beban Sewa", type: "expense", kind: "other" },
  { code: "5-5400", name: "Beban Lain-lain", type: "expense", kind: "other" },
  { code: "5-5500", name: "Selisih Persediaan", type: "expense", kind: "other" },
  { code: "5-5600", name: "Beban Penyusutan", type: "expense", kind: "depreciation" },
  { code: "5-5700", name: "Rugi Penjualan Aset", type: "expense", kind: "asset_disposal" },
];

const ITEM_SEED = [
  { sku: "SKU-001", name: "Kopi Susu GG Botol 250ml", category: "Minuman", unit: "pcs", salePrice: 15000, costPrice: 9000, taxRate: 11, trackStock: true, minStock: 12, opening: 60 },
  { sku: "SKU-002", name: "Air Mineral 600ml", category: "Minuman", unit: "pcs", salePrice: 5000, costPrice: 3000, taxRate: 11, trackStock: true, minStock: 24, opening: 96 },
  { sku: "SKU-003", name: "Roti Bakar Frozen", category: "Makanan", unit: "pcs", salePrice: 12000, costPrice: 7500, taxRate: 11, trackStock: true, minStock: 10, opening: 40 },
  { sku: "SKU-004", name: "Keripik Singkong GG", category: "Makanan", unit: "pcs", salePrice: 18000, costPrice: 11000, taxRate: 11, trackStock: true, minStock: 10, opening: 50 },
  { sku: "SKU-005", name: "Gula Pasir 1kg", category: "Sembako", unit: "kg", salePrice: 17000, costPrice: 14500, taxRate: 11, trackStock: true, minStock: 8, opening: 32 },
  { sku: "SKU-006", name: "Beras Premium 5kg", category: "Sembako", unit: "karung", salePrice: 78000, costPrice: 68000, taxRate: 11, trackStock: true, minStock: 5, opening: 20 },
  { sku: "SKU-007", name: "Jasa Antar & Instalasi", category: "Jasa", unit: "job", salePrice: 50000, costPrice: 0, taxRate: 11, trackStock: false, minStock: 0, opening: 0 },
];

const CUSTOMER_SEED = [
  { code: "C-001", name: "Budi Santoso", phone: "0812-1111-2222", email: "budi@example.com", address: "Jl. Merdeka 12, Bandung" },
  { code: "C-002", name: "Warung Mekar Sari", phone: "0813-3333-4444", email: "mekar@example.com", address: "Jl. Pasar Baru 8, Bandung" },
  { code: "C-003", name: "PT Maju Jaya Abadi", phone: "022-7778888", email: "finance@majujaya.co.id", address: "Gedung Wisma Lantai 4, Jakarta" },
];

const SUPPLIER_SEED = [
  { code: "S-001", name: "PT Distribusi Nusantara", phone: "021-5551234", email: "sales@distnusantara.co.id", address: "Kawasan Industri Pulogadung, Jakarta" },
  { code: "S-002", name: "CV Sumber Pangan Lestari", phone: "022-4449876", email: "order@sumberpangan.id", address: "Jl. Soekarno Hatta 210, Bandung" },
];

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Idempotent: inserts any missing system account for the company.
 * Keeps older tenants in sync when the seed template grows (e.g. new asset accounts).
 */
async function ensureSystemAccounts(ctx: any, companyId: Id<"companies">) {
  const existing = await ctx.db
    .query("accounts")
    .withIndex("by_company", (q: any) => q.eq("companyId", companyId))
    .take(300);
  const byCode = new Set(existing.map((a: any) => a.code));
  const missing = COA_SEED.filter((acc) => !byCode.has(acc.code));
  for (const acc of missing) {
    await ctx.db.insert("accounts", {
      companyId,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      kind: acc.kind,
      isSystem: true,
      isActive: true,
    });
  }
  return missing.length;
}

/**
 * Idempotent bootstrap: creates the tenant company, chart of accounts,
 * master data, and opening balances for a freshly signed-up user.
 */
export const ensureCompany = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Belum masuk");
    const uid = userId as Id<"users">;

    const existing = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", uid))
      .first();
    if (existing) {
      await ensureSystemAccounts(ctx, existing._id);
      return existing._id;
    }

    const user = await ctx.db.get(uid);
    // Nama dari form pendaftaran dipakai apa adanya (mis. "Toko Berkah Jaya").
    const registeredName = (user?.name ?? "").trim();
    const companyId = await ctx.db.insert("companies", {
      ownerId: uid,
      name: registeredName || "Toko GG Online",
      seeded: true,
    });

    // Chart of accounts
    const accountIds: Record<string, Id<"accounts">> = {};
    for (const acc of COA_SEED) {
      const id = await ctx.db.insert("accounts", {
        companyId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        kind: acc.kind,
        isSystem: true,
        isActive: true,
      });
      accountIds[acc.kind] = id;
      if (acc.code === "1-1000") accountIds.cash = id;
      if (acc.code === "1-1010") accountIds.bank = id;
      if (acc.code === "1-1100") accountIds.receivable = id;
      if (acc.code === "1-1200") accountIds.inventory = id;
      if (acc.code === "1-1300") accountIds.tax_in = id;
      if (acc.code === "2-2000") accountIds.payable = id;
      if (acc.code === "2-2100") accountIds.tax_out = id;
      if (acc.code === "3-3000") accountIds.equity = id;
      if (acc.code === "4-4000") accountIds.sales = id;
      if (acc.code === "5-5000") accountIds.cogs = id;
    }

    const warehouseId = await ctx.db.insert("warehouses", {
      companyId,
      code: "WH-01",
      name: "Gudang Utama",
      location: "Bandung",
    });

    // Master data
    for (const c of CUSTOMER_SEED) {
      await ctx.db.insert("customers", { companyId, ...c, isActive: true });
    }
    for (const s of SUPPLIER_SEED) {
      await ctx.db.insert("suppliers", { companyId, ...s, isActive: true });
    }

    // Items + opening stock
    let inventoryValue = 0;
    for (const item of ITEM_SEED) {
      const itemId = await ctx.db.insert("items", {
        companyId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit,
        salePrice: item.salePrice,
        costPrice: item.costPrice,
        taxRate: item.taxRate,
        trackStock: item.trackStock,
        minStock: item.minStock,
        isActive: true,
      });
      if (item.trackStock && item.opening > 0) {
        await applyStockMove(ctx, {
          companyId,
          itemId,
          warehouseId,
          date: todayISO(),
          qty: item.opening,
          unitCost: item.costPrice,
          refType: "OPENING",
          refNumber: "SALDO-AWAL",
          note: "Saldo awal persediaan",
        });
        inventoryValue += item.opening * item.costPrice;
      }
    }

    // Opening balances: cash 5jt, bank 25jt, inventory, funded by equity
    const openingCash = 5_000_000;
    const openingBank = 25_000_000;
    await postJournal(ctx, {
      companyId,
      date: todayISO(),
      memo: "Saldo awal perusahaan",
      sourceType: "OPENING",
      sourceNumber: "SALDO-AWAL",
      userId: uid,
      lines: [
        { accountId: accountIds.cash, debit: openingCash, credit: 0 },
        { accountId: accountIds.bank, debit: openingBank, credit: 0 },
        { accountId: accountIds.inventory, debit: inventoryValue, credit: 0 },
        {
          accountId: accountIds.equity,
          debit: 0,
          credit: openingCash + openingBank + inventoryValue,
        },
      ],
    });

    await logAudit(ctx, {
      companyId,
      userId: uid,
      action: "CREATE",
      entity: "Perusahaan",
      entityNumber: "SALDO-AWAL",
      detail: "Inisialisasi tenant, COA, master data dan saldo awal",
    });

    return companyId;
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId as Id<"users">);
    const company = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId as Id<"users">))
      .first();
    return {
      userId,
      userName: user?.name || "Pengguna GG",
      email: user?.email ?? "",
      company: company
        ? {
            _id: company._id,
            name: company.name,
            taxId: company.taxId ?? "",
            address: company.address ?? "",
            phone: company.phone ?? "",
          }
        : null,
    };
  },
});

export const updateCompany = mutation({
  args: {
    name: v.string(),
    taxId: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Belum masuk");
    const company = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId as Id<"users">))
      .first();
    if (!company) throw new ConvexError("Perusahaan belum dibuat");
    await ctx.db.patch(company._id, {
      name: args.name,
      taxId: args.taxId,
      address: args.address,
      phone: args.phone,
    });
    await logAudit(ctx, {
      companyId: company._id,
      userId: userId as Id<"users">,
      action: "UPDATE",
      entity: "Profil Perusahaan",
      entityNumber: args.name,
    });
    return company._id;
  },
});

export const auditLogs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const company = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId as Id<"users">))
      .first();
    if (!company) return [];
    return ctx.db
      .query("auditLogs")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .order("desc")
      .take(60);
  },
});
