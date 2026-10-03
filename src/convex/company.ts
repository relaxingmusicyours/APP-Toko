import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id, TableNames } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { logAudit } from "./lib/posting";

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
 * Pastikan akun pemilik terdaftar sebagai anggota tim (peran "owner") supaya
 * menu Pengguna langsung menampilkan dia. Idempotent.
 */
async function ensureOwnerMemberRow(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  uid: Id<"users">,
) {
  const user = await ctx.db.get(uid);
  const email = (user?.email ?? "").trim().toLowerCase();
  if (!email) return;
  const existing = await ctx.db
    .query("companyMembers")
    .withIndex("by_company_email", (q) => q.eq("companyId", companyId).eq("email", email))
    .first();
  if (existing) return;
  await ctx.db.insert("companyMembers", {
    companyId,
    userId: uid,
    email,
    name: user?.name || "Pemilik",
    role: "owner",
    status: "active",
    invitedAt: Date.now(),
  });
}

/**
 * Idempotent bootstrap: membuat tenant + Chart of Accounts sistem + satu gudang
 * default. Master data (pelanggan, pemasok, barang) dan saldo awal sengaja
 * TIDAK dibuat — workspace baru mulai kosong dan diisi pengguna sendiri lewat
 * menu Master Data (dibantu tutorial di sisi frontend).
 */
async function bootstrapCompany(ctx: MutationCtx, uid: Id<"users">): Promise<Id<"companies">> {
  const existing = await ctx.db
    .query("companies")
    .withIndex("by_owner", (q) => q.eq("ownerId", uid))
    .first();
  if (existing) {
    await ensureSystemAccounts(ctx, existing._id);
    await ensureOwnerMemberRow(ctx, existing._id, uid);
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

  // Chart of accounts sistem — satu-satunya data bawaan.
  for (const acc of COA_SEED) {
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

  // Satu gudang default supaya kasir & pembelian langsung bisa jalan.
  await ctx.db.insert("warehouses", {
    companyId,
    code: "WH-01",
    name: "Gudang Utama",
  });

  await ensureOwnerMemberRow(ctx, companyId, uid);

  await logAudit(ctx, {
    companyId,
    userId: uid,
    action: "CREATE",
    entity: "Perusahaan",
    detail: "Inisialisasi tenant kosong dengan Chart of Accounts sistem dan Gudang Utama",
  });

  return companyId;
}

/**
 * Mengosongkan database tenant: hapus seluruh transaksi, jurnal, dan master
 * data. Chart of Accounts dan gudang tetap dipertahankan karena keduanya
 * struktur wajib agar aplikasi tetap bisa dipakai.
 */
async function wipeBusinessData(ctx: MutationCtx, companyId: Id<"companies">) {
  const clear = async (ids: Array<Id<TableNames>>) => {
    for (const id of ids) await ctx.db.delete(id);
  };
  const mine = (rows: Array<{ _id: Id<TableNames>; companyId: Id<"companies"> }>) =>
    rows.filter((row) => row.companyId === companyId).map((row) => row._id);

  // Baris anak dihapus lebih dulu agar tidak menggantung.
  await clear(mine(await ctx.db.query("salesInvoiceLines").collect()));
  await clear(mine(await ctx.db.query("salesReturnLines").collect()));
  await clear(mine(await ctx.db.query("purchaseBillLines").collect()));
  await clear(mine(await ctx.db.query("journalLines").collect()));
  await clear(mine(await ctx.db.query("salesReturns").collect()));
  await clear(mine(await ctx.db.query("salesInvoices").collect()));
  await clear(mine(await ctx.db.query("purchaseBills").collect()));
  await clear(mine(await ctx.db.query("receipts").collect()));
  await clear(mine(await ctx.db.query("payments").collect()));
  await clear(mine(await ctx.db.query("cashTransactions").collect()));
  await clear(mine(await ctx.db.query("journalEntries").collect()));
  await clear(mine(await ctx.db.query("stockMovements").collect()));
  await clear(mine(await ctx.db.query("stockBalances").collect()));
  await clear(mine(await ctx.db.query("fixedAssets").collect()));
  await clear(mine(await ctx.db.query("items").collect()));
  await clear(mine(await ctx.db.query("customers").collect()));
  await clear(mine(await ctx.db.query("suppliers").collect()));
  await clear(mine(await ctx.db.query("counters").collect()));
  await clear(mine(await ctx.db.query("auditLogs").collect()));
}

export const ensureCompany = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Belum masuk");
    return await bootstrapCompany(ctx, userId as Id<"users">);
  },
});

/** Menghapus semua data bisnis tenant; dipakai tombol "Kosongkan database". */
export const clearWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Belum masuk");
    const uid = userId as Id<"users">;
    const companyId = await bootstrapCompany(ctx, uid);
    await wipeBusinessData(ctx, companyId);
    await logAudit(ctx, {
      companyId,
      userId: uid,
      action: "DELETE",
      entity: "Database",
      detail: "Seluruh data bisnis dihapus (COA dan gudang tetap ada)",
    });
    return companyId;
  },
});

/**
 * Dipanggil setelah login akun demo: memastikan workspace ada, lalu
 * mengosongkan database sehingga setiap sesi demo mulai dari nol.
 */
export const prepareDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Belum masuk");
    const uid = userId as Id<"users">;
    const companyId = await bootstrapCompany(ctx, uid);
    await wipeBusinessData(ctx, companyId);
    return { companyId, cleared: true };
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
