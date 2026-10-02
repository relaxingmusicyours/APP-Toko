import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { logAudit, nextNumber } from "./lib/posting";

/* ------------------------------- Customers ------------------------------- */

export const customers = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("customers")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(300);
  },
});

export const saveCustomer = mutation({
  args: {
    id: v.optional(v.id("customers")),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (!args.name.trim()) throw new ConvexError("Nama pelanggan wajib diisi");
    if (args.id) {
      const doc = await ctx.db.get(args.id);
      if (!doc || doc.companyId !== companyId) throw new ConvexError("Pelanggan tidak ditemukan");
      await ctx.db.patch(args.id, {
        name: args.name.trim(),
        phone: args.phone,
        email: args.email,
        address: args.address,
      });
      await logAudit(ctx, { companyId, userId, action: "UPDATE", entity: "Pelanggan", entityNumber: doc.code });
      return args.id;
    }
    const code = await nextNumber(ctx, companyId, "C");
    const id = await ctx.db.insert("customers", {
      companyId,
      code,
      name: args.name.trim(),
      phone: args.phone,
      email: args.email,
      address: args.address,
      isActive: true,
    });
    await logAudit(ctx, { companyId, userId, action: "CREATE", entity: "Pelanggan", entityNumber: code });
    return id;
  },
});

/* ------------------------------- Suppliers ------------------------------- */

export const suppliers = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("suppliers")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(300);
  },
});

export const saveSupplier = mutation({
  args: {
    id: v.optional(v.id("suppliers")),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (!args.name.trim()) throw new ConvexError("Nama pemasok wajib diisi");
    if (args.id) {
      const doc = await ctx.db.get(args.id);
      if (!doc || doc.companyId !== companyId) throw new ConvexError("Pemasok tidak ditemukan");
      await ctx.db.patch(args.id, {
        name: args.name.trim(),
        phone: args.phone,
        email: args.email,
        address: args.address,
      });
      await logAudit(ctx, { companyId, userId, action: "UPDATE", entity: "Pemasok", entityNumber: doc.code });
      return args.id;
    }
    const code = await nextNumber(ctx, companyId, "S");
    const id = await ctx.db.insert("suppliers", {
      companyId,
      code,
      name: args.name.trim(),
      phone: args.phone,
      email: args.email,
      address: args.address,
      isActive: true,
    });
    await logAudit(ctx, { companyId, userId, action: "CREATE", entity: "Pemasok", entityNumber: code });
    return id;
  },
});

/* ------------------------------- Warehouses ------------------------------ */

export const warehouses = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(100);
  },
});

export const saveWarehouse = mutation({
  args: {
    id: v.optional(v.id("warehouses")),
    name: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (!args.name.trim()) throw new ConvexError("Nama gudang wajib diisi");
    if (args.id) {
      const doc = await ctx.db.get(args.id);
      if (!doc || doc.companyId !== companyId) throw new ConvexError("Gudang tidak ditemukan");
      await ctx.db.patch(args.id, { name: args.name.trim(), location: args.location });
      return args.id;
    }
    const code = await nextNumber(ctx, companyId, "WH");
    const id = await ctx.db.insert("warehouses", {
      companyId,
      code,
      name: args.name.trim(),
      location: args.location,
    });
    await logAudit(ctx, { companyId, userId, action: "CREATE", entity: "Gudang", entityNumber: code });
    return id;
  },
});

/* ---------------------------------- Items -------------------------------- */

export const items = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(500);
  },
});

export const saveItem = mutation({
  args: {
    id: v.optional(v.id("items")),
    sku: v.optional(v.string()),
    name: v.string(),
    category: v.optional(v.string()),
    unit: v.string(),
    salePrice: v.number(),
    costPrice: v.number(),
    taxRate: v.number(),
    trackStock: v.boolean(),
    minStock: v.number(),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (!args.name.trim()) throw new ConvexError("Nama barang wajib diisi");
    if (args.salePrice < 0 || args.costPrice < 0) throw new ConvexError("Harga tidak boleh negatif");

    if (args.id) {
      const doc = await ctx.db.get(args.id);
      if (!doc || doc.companyId !== companyId) throw new ConvexError("Barang tidak ditemukan");
      await ctx.db.patch(args.id, {
        name: args.name.trim(),
        category: args.category,
        unit: args.unit,
        salePrice: Math.round(args.salePrice),
        costPrice: Math.round(args.costPrice),
        taxRate: args.taxRate,
        trackStock: args.trackStock,
        minStock: Math.round(args.minStock),
      });
      await logAudit(ctx, { companyId, userId, action: "UPDATE", entity: "Barang", entityNumber: doc.sku });
      return args.id;
    }

    const sku = args.sku?.trim() || (await nextNumber(ctx, companyId, "SKU"));
    const duplicate = await ctx.db
      .query("items")
      .withIndex("by_company_sku", (q) => q.eq("companyId", companyId).eq("sku", sku))
      .unique();
    if (duplicate) throw new ConvexError(`SKU ${sku} sudah dipakai`);

    const id = await ctx.db.insert("items", {
      companyId,
      sku,
      name: args.name.trim(),
      category: args.category,
      unit: args.unit,
      salePrice: Math.round(args.salePrice),
      costPrice: Math.round(args.costPrice),
      taxRate: args.taxRate,
      trackStock: args.trackStock,
      minStock: Math.round(args.minStock),
      isActive: true,
    });
    await logAudit(ctx, { companyId, userId, action: "CREATE", entity: "Barang", entityNumber: sku });
    return id;
  },
});
