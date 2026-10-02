import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import {
  applyStockMove,
  findAccountByKind,
  logAudit,
  nextNumber,
  postJournal,
} from "./lib/posting";

export const listInvoices = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("salesInvoices")
      .withIndex("by_company_number", (q) => q.eq("companyId", tenant.companyId))
      .order("desc")
      .take(120);
  },
});

export const getInvoice = query({
  args: { invoiceId: v.id("salesInvoices") },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.companyId !== tenant.companyId) return null;
    const lines = await ctx.db
      .query("salesInvoiceLines")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
      .take(100);
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
      .take(50);
    const entry = await ctx.db
      .query("journalEntries")
      .withIndex("by_company_source", (q) =>
        q.eq("companyId", tenant.companyId).eq("sourceNumber", invoice.number),
      )
      .first();
    const entryLines = entry
      ? await ctx.db
          .query("journalLines")
          .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
          .take(50)
      : [];
    return { invoice, lines, receipts, entry: entry ? { ...entry, lines: entryLines } : null };
  },
});

export const createInvoice = mutation({
  args: {
    date: v.string(),
    dueDate: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    customerName: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    memo: v.optional(v.string()),
    warehouseId: v.optional(v.id("warehouses")),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        qty: v.number(),
        price: v.number(),
        discount: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (args.lines.length === 0) throw new ConvexError("Tambahkan minimal satu baris barang");

    const warehouseId =
      args.warehouseId ??
      (
        await ctx.db
          .query("warehouses")
          .withIndex("by_company", (q) => q.eq("companyId", companyId))
          .first()
      )?._id;
    if (!warehouseId) throw new ConvexError("Belum ada gudang aktif");

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let cogsTotal = 0;

    const computed: Array<{
      itemId: typeof args.lines[number]["itemId"];
      sku: string;
      name: string;
      unit: string;
      qty: number;
      price: number;
      discount: number;
      taxRate: number;
      amount: number;
      cost: number;
      trackStock: boolean;
    }> = [];

    for (const line of args.lines) {
      if (line.qty <= 0) throw new ConvexError("Qty harus lebih dari 0");
      const item = await ctx.db.get(line.itemId);
      if (!item || item.companyId !== companyId) throw new ConvexError("Barang tidak ditemukan");
      const price = Math.round(line.price);
      const gross = Math.round(line.qty * price);
      const discount = Math.min(Math.max(Math.round(line.discount), 0), gross);
      const amount = gross - discount;
      const tax = Math.round((amount * item.taxRate) / 100);
      subtotal += amount;
      discountTotal += discount;
      taxTotal += tax;
      if (item.trackStock) cogsTotal += Math.round(line.qty * item.costPrice);
      computed.push({
        itemId: item._id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        qty: line.qty,
        price,
        discount,
        taxRate: item.taxRate,
        amount,
        cost: item.costPrice,
        trackStock: item.trackStock,
      });
    }

    const total = subtotal + taxTotal;
    if (total <= 0) throw new ConvexError("Nilai faktur harus lebih dari 0");

    let customerName = args.customerName?.trim();
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (!customer || customer.companyId !== companyId) throw new ConvexError("Pelanggan tidak ditemukan");
      customerName = customer.name;
    }
    if (!customerName) throw new ConvexError("Pilih pelanggan atau isi nama pembeli");

    const number = await nextNumber(ctx, companyId, "INV");
    const invoiceId = await ctx.db.insert("salesInvoices", {
      companyId,
      number,
      date: args.date,
      dueDate: args.dueDate,
      customerId: args.customerId,
      customerName,
      sourceRef: args.sourceRef,
      memo: args.memo,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      paid: 0,
      status: "posted",
      isPos: false,
      createdBy: userId,
      createdAt: Date.now(),
    });

    for (const line of computed) {
      await ctx.db.insert("salesInvoiceLines", {
        companyId,
        invoiceId,
        itemId: line.itemId,
        sku: line.sku,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        price: line.price,
        discount: line.discount,
        taxRate: line.taxRate,
        amount: line.amount,
        cost: line.cost,
      });
      if (line.trackStock) {
        await applyStockMove(ctx, {
          companyId,
          itemId: line.itemId,
          warehouseId,
          date: args.date,
          qty: -line.qty,
          unitCost: line.cost,
          refType: "SALE",
          refNumber: number,
          note: `Penjualan ${customerName}`,
        });
      }
    }

    const ar = await findAccountByKind(ctx, companyId, "receivable");
    const salesAcc = await findAccountByKind(ctx, companyId, "sales");
    const taxOut = await findAccountByKind(ctx, companyId, "tax_out");
    const lines: Array<{ accountId: typeof ar; debit: number; credit: number; memo?: string }> = [
      { accountId: ar, debit: total, credit: 0, memo: customerName },
    ];
    if (subtotal > 0) lines.push({ accountId: salesAcc, debit: 0, credit: subtotal });
    if (taxTotal > 0) lines.push({ accountId: taxOut, debit: 0, credit: taxTotal });
    if (cogsTotal > 0) {
      const cogsAcc = await findAccountByKind(ctx, companyId, "cogs");
      const invAcc = await findAccountByKind(ctx, companyId, "inventory");
      lines.push({ accountId: cogsAcc, debit: cogsTotal, credit: 0 });
      lines.push({ accountId: invAcc, debit: 0, credit: cogsTotal });
    }

    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `Faktur penjualan ${number} — ${customerName}`,
      sourceType: "SALES_INVOICE",
      sourceNumber: number,
      userId,
      lines,
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Faktur Penjualan",
      entityNumber: number,
      detail: `${customerName} • Rp ${total.toLocaleString("id-ID")}`,
    });

    return { invoiceId, number, total };
  },
});

export const recordReceipt = mutation({
  args: {
    invoiceId: v.id("salesInvoices"),
    date: v.string(),
    amount: v.number(),
    method: v.string(),
    accountId: v.id("accounts"),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.companyId !== companyId) throw new ConvexError("Faktur tidak ditemukan");
    if (invoice.status === "void") throw new ConvexError("Faktur sudah dibatalkan");

    const amount = Math.round(args.amount);
    const remaining = invoice.total - invoice.paid;
    if (amount <= 0) throw new ConvexError("Nominal penerimaan harus lebih dari 0");
    if (amount > remaining) {
      throw new ConvexError(`Nominal melebihi sisa tagihan (Rp ${remaining.toLocaleString("id-ID")})`);
    }

    const account = await ctx.db.get(args.accountId);
    if (!account || account.companyId !== companyId) throw new ConvexError("Akun kas/bank tidak ditemukan");
    if (account.kind !== "cash" && account.kind !== "bank") {
      throw new ConvexError("Pilih akun kas atau bank");
    }

    const number = await nextNumber(ctx, companyId, "RCV");
    await ctx.db.insert("receipts", {
      companyId,
      number,
      date: args.date,
      customerId: invoice.customerId,
      invoiceId: invoice._id,
      amount,
      method: args.method,
      accountId: account._id,
      memo: args.memo,
      createdBy: userId,
    });

    const newPaid = invoice.paid + amount;
    await ctx.db.patch(invoice._id, {
      paid: newPaid,
      status: newPaid >= invoice.total ? "paid" : "posted",
    });

    const ar = await findAccountByKind(ctx, companyId, "receivable");
    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `Penerimaan ${number} — ${invoice.number} (${invoice.customerName})`,
      sourceType: "RECEIPT",
      sourceNumber: number,
      userId,
      lines: [
        { accountId: account._id, debit: amount, credit: 0, memo: args.method },
        { accountId: ar, debit: 0, credit: amount },
      ],
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Penerimaan Penjualan",
      entityNumber: number,
      detail: `${invoice.number} • Rp ${amount.toLocaleString("id-ID")} via ${args.method}`,
    });

    return { number, remaining: invoice.total - newPaid };
  },
});

export const voidInvoice = mutation({
  args: { invoiceId: v.id("salesInvoices"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.companyId !== companyId) throw new ConvexError("Faktur tidak ditemukan");
    if (invoice.status === "void") return null;
    if (invoice.paid > 0) {
      throw new ConvexError("Faktur sudah ada penerimaan. Batalkan lewat jurnal koreksi.");
    }

    const entry = await ctx.db
      .query("journalEntries")
      .withIndex("by_company_source", (q) =>
        q.eq("companyId", companyId).eq("sourceNumber", invoice.number),
      )
      .first();
    if (entry) {
      const entryLines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .take(50);
      await postJournal(ctx, {
        companyId,
        date: invoice.date,
        memo: `Void ${invoice.number} — ${args.reason ?? "pembatalan faktur"}`,
        sourceType: "VOID_SALES_INVOICE",
        sourceNumber: invoice.number,
        userId,
        lines: entryLines.map((l) => ({
          accountId: l.accountId,
          debit: l.credit,
          credit: l.debit,
          memo: "Reversal",
        })),
      });
    }

    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_company_ref", (q) =>
        q.eq("companyId", companyId).eq("refType", "SALE").eq("refNumber", invoice.number),
      )
      .take(200);
    for (const m of movements) {
      await applyStockMove(ctx, {
        companyId,
        itemId: m.itemId,
        warehouseId: m.warehouseId,
        date: invoice.date,
        qty: -m.qty,
        unitCost: m.unitCost,
        refType: "SALE_VOID",
        refNumber: invoice.number,
        note: "Pembatalan faktur penjualan",
      });
    }

    await ctx.db.patch(invoice._id, { status: "void" });
    await logAudit(ctx, {
      companyId,
      userId,
      action: "VOID",
      entity: "Faktur Penjualan",
      entityNumber: invoice.number,
      detail: args.reason,
    });
    return null;
  },
});
