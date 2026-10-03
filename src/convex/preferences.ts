import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { logAudit } from "./lib/posting";

/**
 * Menu "Alat" di Pengaturan:
 * - Preferensi & Desain Cetakan → disimpan di tabel `companies`
 * - Pengguna & Akses Grup      → disimpan di tabel `companyMembers`
 */

const ROLES = ["owner", "manager", "cashier", "accountant"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = {
  owner: "Pemilik",
  manager: "Manajer",
  cashier: "Kasir",
  accountant: "Pembukuan",
};

/** Hanya akun pemilik perusahaan yang boleh mengelola anggota tim. */
async function requireOwner(ctx: any, companyId: Id<"companies">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Belum masuk");
  const company = await ctx.db.get(companyId);
  if (!company) throw new ConvexError("Perusahaan tidak ditemukan");
  if (company.ownerId !== userId) {
    throw new ConvexError("Hanya pemilik perusahaan yang dapat mengubah anggota tim");
  }
  return userId as Id<"users">;
}

export const preferences = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const company = await ctx.db.get(tenant.companyId);
    if (!company) return null;
    return {
      fiscalYear: company.fiscalYear ?? new Date().getFullYear().toString(),
      dateFormat: company.dateFormat ?? "dd/MM/yyyy",
      currency: company.currency ?? "IDR",
      defaultTaxRate: company.defaultTaxRate ?? 11,
      lowStockAlert: company.lowStockAlert ?? true,
      receiptSize: company.receiptSize ?? "80mm",
      receiptFooter: company.receiptFooter ?? "Terima kasih telah berbelanja",
      showReceiptLogo: company.showReceiptLogo ?? true,
      showTaxDetail: company.showTaxDetail ?? true,
    };
  },
});

export const savePreferences = mutation({
  args: {
    fiscalYear: v.optional(v.string()),
    dateFormat: v.optional(v.string()),
    currency: v.optional(v.string()),
    defaultTaxRate: v.optional(v.number()),
    lowStockAlert: v.optional(v.boolean()),
    receiptSize: v.optional(v.string()),
    receiptFooter: v.optional(v.string()),
    showReceiptLogo: v.optional(v.boolean()),
    showTaxDetail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (args.defaultTaxRate !== undefined) {
      if (args.defaultTaxRate < 0 || args.defaultTaxRate > 100) {
        throw new ConvexError("PPN harus antara 0 dan 100");
      }
    }
    if (args.fiscalYear !== undefined && !/^\d{4}$/.test(args.fiscalYear)) {
      throw new ConvexError("Tahun buku harus 4 digit, mis. 2026");
    }
    await ctx.db.patch(companyId, {
      fiscalYear: args.fiscalYear,
      dateFormat: args.dateFormat,
      currency: args.currency,
      defaultTaxRate: args.defaultTaxRate,
      lowStockAlert: args.lowStockAlert,
      receiptSize: args.receiptSize,
      receiptFooter: args.receiptFooter,
      showReceiptLogo: args.showReceiptLogo,
      showTaxDetail: args.showTaxDetail,
    });
    await logAudit(ctx, {
      companyId,
      userId,
      action: "UPDATE",
      entity: "Preferensi",
      detail: "Perubahan preferensi perusahaan & desain cetakan",
    });
    return companyId;
  },
});

/* ------------------------------- Pengguna ------------------------------- */

export const members = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const rows = await ctx.db
      .query("companyMembers")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(200);
    return rows.map((row) => ({ ...row, roleLabel: ROLE_LABEL[row.role] }));
  },
});

export const inviteMember = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("manager"),
      v.literal("cashier"),
      v.literal("accountant"),
    ),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    if (!name) throw new ConvexError("Nama wajib diisi");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new ConvexError("Format email tidak valid");
    }
    const { companyId } = await requireCompany(ctx);
    const userId = await requireOwner(ctx, companyId);

    const duplicate = await ctx.db
      .query("companyMembers")
      .withIndex("by_company_email", (q) => q.eq("companyId", companyId).eq("email", email))
      .first();
    if (duplicate) throw new ConvexError(`${email} sudah ada di daftar anggota`);

    // Hubungkan ke akun yang sudah terdaftar bila email-nya cocok.
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    const id = await ctx.db.insert("companyMembers", {
      companyId,
      userId: existingUser?._id,
      email,
      name,
      role: args.role,
      status: existingUser ? "active" : "invited",
      invitedAt: Date.now(),
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "CREATE",
      entity: "Anggota Tim",
      entityNumber: email,
      detail: `${name} — ${ROLE_LABEL[args.role]}`,
    });
    return id;
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("companyMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new ConvexError("Anggota tidak ditemukan");
    const userId = await requireOwner(ctx, member.companyId);
    if (member.role === "owner") {
      throw new ConvexError("Akun pemilik tidak bisa dihapus");
    }
    await ctx.db.delete(args.memberId);
    await logAudit(ctx, {
      companyId: member.companyId,
      userId,
      action: "DELETE",
      entity: "Anggota Tim",
      entityNumber: member.email,
      detail: member.name,
    });
  },
});

/** Matikan/hidupkan anggota tanpa menghapus riwayat audit-nya. */
export const toggleMember = mutation({
  args: { memberId: v.id("companyMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new ConvexError("Anggota tidak ditemukan");
    const userId = await requireOwner(ctx, member.companyId);
    if (member.role === "owner") throw new ConvexError("Akun pemilik tidak bisa dinonaktifkan");
    await ctx.db.patch(args.memberId, {
      status: member.status === "active" ? "invited" : "active",
    });
    await logAudit(ctx, {
      companyId: member.companyId,
      userId,
      action: "UPDATE",
      entity: "Anggota Tim",
      entityNumber: member.email,
      detail: member.status === "active" ? "Nonaktifkan anggota" : "Aktifkan anggota",
    });
  },
});

/** Ringkasan peran untuk kartu "Akses Grup". */
export const accessSummary = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const rows = await ctx.db
      .query("companyMembers")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(200);
    return ROLES.map((role) => ({
      role,
      label: ROLE_LABEL[role],
      count: rows.filter((row) => row.role === role).length,
    }));
  },
});