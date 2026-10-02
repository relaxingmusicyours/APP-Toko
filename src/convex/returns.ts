import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { applyStockMove, findAccountByKind, logAudit, nextNumber, postJournal } from "./lib/posting";

export const listReturns = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("salesReturns")
      .withIndex("by_company_number", (q) => q.eq("companyId", tenant.companyId))
      .order("desc")
      .take(80);
  },
});

/**
 * Retur penjualan (credit note): reverses revenue + PPN, credits receivable,
 * returns stock to the warehouse and unwinds COGS.
 */
export const createReturn = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    date: v.string(),
    reason: v.optional(v.string()),
    restock: v.boolean(),
    lines: v.array(
      v.object({
        invoiceLineId: v.id("salesInvoiceLines"),
        qty: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.companyId !== companyId) throw new ConvexError("Faktur tidak ditemukan");
    if (invoice.status === "void") throw new ConvexError("Faktur sudah dibatalkan, tidak bisa diretur");

    const valid = args.lines.filter((line) => line.qty > 0);
    if (valid.length === 0) throw new ConvexError("Pilih minimal satu barang yang diretur");

    // How much of each invoice line was already returned
    const previousReturns = await ctx.db
      .query("salesReturns")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
      .take(50);
    const returnedQty = new Map<string, number>();
    for (const prev of previousReturns) {
      const prevLines = await ctx.db
        .query("salesReturnLines")
        .withIndex("by_return", (q) => q.eq("returnId", prev._id))
        .take(100);
      for (const prevLine of prevLines) {
        returnedQty.set(
          prevLine.invoiceLineId,
          (returnedQty.get(prevLine.invoiceLineId) ?? 0) + prevLine.qty,
        );
      }
    }

    const warehouseId = (
      await ctx.db
        .query("warehouses")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .first()
    )?._id;
    if (args.restock && !warehouseId) throw new ConvexError("Belum ada gudang untuk menerima barang retur");

    let subtotal = 0;
    let taxTotal = 0;
    let cogsReversal = 0;

    const number = await nextNumber(ctx, companyId, "RTN");
    const returnId = await ctx.db.insert("salesReturns", {
      companyId,
      number,
      date: args.date,
      invoiceId: invoice._id,
      invoiceNumber: invoice.number,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      reason: args.reason,
      restock: args.restock,
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      cogsReversal: 0,
      createdBy: userId,
      createdAt: Date.now(),
    });

    for (const line of valid) {
      const invoiceLine = await ctx.db.get(line.invoiceLineId);
      if (!invoiceLine || invoiceLine.companyId !== companyId) {
        throw new ConvexError("Baris faktur tidak ditemukan");
      }
      if (invoiceLine.invoiceId !== invoice._id) {
        throw new ConvexError("Baris faktur tidak sesuai dengan faktur yang dipilih");
      }
      const alreadyReturned = returnedQty.get(line.invoiceLineId) ?? 0;
      const remaining = invoiceLine.qty - alreadyReturned;
      if (line.qty > remaining) {
        throw new ConvexError(
          `Qty retur melebihi sisa yang dapat diretur (${remaining} ${invoiceLine.unit}) untuk ${invoiceLine.name}`,
        );
      }

      const ratio = invoiceLine.qty > 0 ? line.qty / invoiceLine.qty : 0;
      const amount = Math.round(invoiceLine.amount * ratio);
      const tax = Math.round((amount * invoiceLine.taxRate) / 100);
      subtotal += amount;
      taxTotal += tax;

      let cost = 0;
      if (args.restock && invoiceLine.itemId && warehouseId) {
        cost = Math.round(invoiceLine.cost * line.qty);
        cogsReversal += cost;
        await applyStockMove(ctx, {
          companyId,
          itemId: invoiceLine.itemId,
          warehouseId,
          date: args.date,
          qty: line.qty,
          unitCost: invoiceLine.cost,
          refType: "SALE_RETURN",
          refNumber: number,
          note: `Retur ${invoice.number} — ${invoice.customerName}`,
        });
      }

      await ctx.db.insert("salesReturnLines", {
        companyId,
        returnId,
        invoiceLineId: invoiceLine._id,
        itemId: invoiceLine.itemId,
        sku: invoiceLine.sku,
        name: invoiceLine.name,
        unit: invoiceLine.unit,
        qty: line.qty,
        price: invoiceLine.price,
        amount,
        cost,
      });
    }

    const total = subtotal + taxTotal;
    await ctx.db.patch(returnId, { subtotal, taxTotal, total, cogsReversal });

    // Credit note journal: reverse revenue & output tax, credit receivable
    const ar = await findAccountByKind(ctx, companyId, "receivable");
    const salesAcc = await findAccountByKind(ctx, companyId, "sales");
    const taxOut = await findAccountByKind(ctx, companyId, "tax_out");
    const lines: Array<{ accountId: Id<"accounts">; debit: number; credit: number; memo?: string }> = [];
    if (subtotal > 0) lines.push({ accountId: salesAcc, debit: subtotal, credit: 0, memo: "Retur penjualan" });
    if (taxTotal > 0) lines.push({ accountId: taxOut, debit: taxTotal, credit: 0, memo: "PPN keluaran retur" });
    lines.push({ accountId: ar, debit: 0, credit: total, memo: invoice.customerName });
    if (cogsReversal > 0) {
      const invAcc = await findAccountByKind(ctx, companyId, "inventory");
      const cogsAcc = await findAccountByKind(ctx, companyId, "cogs");
      lines.push({ accountId: invAcc, debit: cogsReversal, credit: 0, memo: "Barang retur masuk gudang" });
      lines.push({ accountId: cogsAcc, debit: 0, credit: cogsReversal, memo: "Pembalikan HPP" });
    }

    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `Retur penjualan ${number} — ${invoice.number} (${invoice.customerName})`,
      sourceType: "SALES_RETURN",
      sourceNumber: number,
      userId,
      lines,
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Retur Penjualan",
      entityNumber: number,
      detail: `${invoice.number} • Rp ${total.toLocaleString("id-ID")} • ${args.restock ? "barang kembali ke gudang" : "tanpa retur stok"}`,
    });

    return { returnId, number, total, restocked: args.restock };
  },
});
