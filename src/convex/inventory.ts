import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { applyStockMove, findAccountByKind, logAudit, nextNumber, postJournal } from "./lib/posting";

export const stockReport = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return { rows: [], warehouses: [] };
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(50);
    const warehouseName = new Map(warehouses.map((w) => [w._id, w.name]));
    const items = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(500);
    const balances = await ctx.db
      .query("stockBalances")
      .withIndex("by_company_item", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);

    const qtyByItem = new Map<string, number>();
    const qtyByItemWh = new Map<string, number>();
    for (const b of balances) {
      qtyByItem.set(b.itemId, (qtyByItem.get(b.itemId) ?? 0) + b.qty);
      qtyByItemWh.set(`${b.itemId}|${b.warehouseId}`, b.qty);
    }

    const rows = items.map((item) => ({
      _id: item._id,
      sku: item.sku,
      name: item.name,
      category: item.category ?? "",
      unit: item.unit,
      salePrice: item.salePrice,
      costPrice: item.costPrice,
      taxRate: item.taxRate,
      trackStock: item.trackStock,
      minStock: item.minStock,
      isActive: item.isActive,
      qty: qtyByItem.get(item._id) ?? 0,
      value: (qtyByItem.get(item._id) ?? 0) * item.costPrice,
      perWarehouse: warehouses.map((w) => ({
        warehouseId: w._id,
        warehouseName: warehouseName.get(w._id) ?? w.name,
        qty: qtyByItemWh.get(`${item._id}|${w._id}`) ?? 0,
      })),
    }));

    return { rows, warehouses };
  },
});

export const movements = query({
  args: { itemId: v.optional(v.id("items")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const limit = Math.min(args.limit ?? 200, 500);
    const list = args.itemId
      ? await ctx.db
          .query("stockMovements")
          .withIndex("by_company_item", (q) =>
            q.eq("companyId", tenant.companyId).eq("itemId", args.itemId!),
          )
          .take(limit)
      : await ctx.db
          .query("stockMovements")
          .withIndex("by_company_item", (q) => q.eq("companyId", tenant.companyId))
          .take(limit);

    const items = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(500);
    const itemName = new Map(items.map((i) => [i._id, `${i.sku} • ${i.name}`]));
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(50);
    const warehouseName = new Map(warehouses.map((w) => [w._id, w.name]));

    return list
      .map((m) => ({
        ...m,
        itemName: itemName.get(m.itemId) ?? m.itemId,
        warehouseName: warehouseName.get(m.warehouseId) ?? m.warehouseId,
      }))
      .sort((a, b) => (a.date === b.date ? b._creationTime - a._creationTime : b.date.localeCompare(a.date)))
      .slice(0, limit);
  },
});

/** Stock opname: posts a variance movement + journal between inventory and variance account. */
export const opname = mutation({
  args: {
    itemId: v.id("items"),
    warehouseId: v.id("warehouses"),
    countedQty: v.number(),
    date: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.companyId !== companyId) throw new ConvexError("Barang tidak ditemukan");
    if (!item.trackStock) throw new ConvexError("Barang jasa tidak memiliki stok");
    const warehouse = await ctx.db.get(args.warehouseId);
    if (!warehouse || warehouse.companyId !== companyId) throw new ConvexError("Gudang tidak ditemukan");

    const balance = await ctx.db
      .query("stockBalances")
      .withIndex("by_company_item", (q) =>
        q.eq("companyId", companyId).eq("itemId", args.itemId),
      )
      .filter((q) => q.eq(q.field("warehouseId"), args.warehouseId))
      .first();
    const current = balance?.qty ?? 0;
    const diff = Math.round(args.countedQty) - current;
    if (diff === 0) throw new ConvexError("Tidak ada selisih: stok sistem sudah sama dengan hasil hitung");
    if (args.countedQty < 0) throw new ConvexError("Hasil hitung tidak boleh negatif");

    const number = await nextNumber(ctx, companyId, "OPN");
    await applyStockMove(ctx, {
      companyId,
      itemId: item._id,
      warehouseId: warehouse._id,
      date: args.date,
      qty: diff,
      unitCost: item.costPrice,
      refType: "OPNAME",
      refNumber: number,
      note: args.note ?? `Stok opname ${warehouse.name}`,
    });

    const value = Math.abs(diff) * item.costPrice;
    const invAcc = await findAccountByKind(ctx, companyId, "inventory");
    const varianceAcc = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) => q.eq("companyId", companyId).eq("code", "5-5500"))
      .unique();
    if (varianceAcc && value > 0) {
      await postJournal(ctx, {
        companyId,
        date: args.date,
        memo: `Stok opname ${number} — ${item.name} (${diff > 0 ? "+" : ""}${diff} ${item.unit})`,
        sourceType: "OPNAME",
        sourceNumber: number,
        userId,
        lines:
          diff > 0
            ? [
                { accountId: invAcc, debit: value, credit: 0 },
                { accountId: varianceAcc._id, debit: 0, credit: value },
              ]
            : [
                { accountId: varianceAcc._id, debit: value, credit: 0 },
                { accountId: invAcc, debit: 0, credit: value },
              ],
      });
    }

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Stok Opname",
      entityNumber: number,
      detail: `${item.sku} • sistem ${current} → hasil hitung ${args.countedQty} (${diff > 0 ? "+" : ""}${diff})`,
    });

    return { number, diff };
  },
});
