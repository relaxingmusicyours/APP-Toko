import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireCompany } from "./lib/context";
import {
  applyStockMove,
  findAccountByKind,
  logAudit,
  nextNumber,
  postJournal,
} from "./lib/posting";

/**
 * Atomic POS checkout: invoice + receipts + stock ledger + journal in one mutation.
 * Only fully-paid sales are accepted on the register; change is returned from cash.
 */
export const checkout = mutation({
  args: {
    date: v.string(),
    warehouseId: v.optional(v.id("warehouses")),
    customerId: v.optional(v.id("customers")),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        qty: v.number(),
        price: v.number(),
      }),
    ),
    payments: v.array(
      v.object({
        method: v.string(),
        accountId: v.optional(v.id("accounts")),
        amount: v.number(),
      }),
    ),
    discount: v.number(),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (args.lines.length === 0) throw new ConvexError("Keranjang kosong");
    if (args.lines.some((l) => l.qty <= 0)) throw new ConvexError("Qty harus lebih dari 0");

    const warehouseId =
      args.warehouseId ??
      (
        await ctx.db
          .query("warehouses")
          .withIndex("by_company", (q) => q.eq("companyId", companyId))
          .first()
      )?._id;
    if (!warehouseId) throw new ConvexError("Belum ada gudang aktif");

    const cashAccount = await findAccountByKind(ctx, companyId, "cash");
    const bankAccount = await findAccountByKind(ctx, companyId, "bank");

    const grossLines = args.lines.map((l) => ({ ...l, price: Math.round(l.price) }));
    const grossTotal = grossLines.reduce((s, l) => s + l.qty * l.price, 0);
    const discount = Math.min(Math.max(Math.round(args.discount), 0), grossTotal);

    let subtotal = 0;
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

    for (const line of grossLines) {
      const item = await ctx.db.get(line.itemId);
      if (!item || item.companyId !== companyId) throw new ConvexError("Barang tidak ditemukan");
      const gross = line.qty * line.price;
      const share = grossTotal > 0 ? gross / grossTotal : 0;
      const lineDiscount = Math.round(discount * share);
      const amount = gross - lineDiscount;
      const tax = Math.round((amount * item.taxRate) / 100);
      subtotal += amount;
      taxTotal += tax;
      if (item.trackStock) cogsTotal += Math.round(line.qty * item.costPrice);
      computed.push({
        itemId: item._id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        qty: line.qty,
        price: line.price,
        discount: lineDiscount,
        taxRate: item.taxRate,
        amount,
        cost: item.costPrice,
        trackStock: item.trackStock,
      });
    }

    const total = subtotal + taxTotal;
    const received = args.payments.reduce((s, p) => s + Math.round(p.amount), 0);
    if (received < total) {
      throw new ConvexError(
        `Uang diterima (Rp ${(received - total).toLocaleString("id-ID")}) kurang dari total`,
      );
    }
    const change = received - total;

    // Split net payments per method; change comes out of cash
    const netPayments = args.payments.map((p) => ({
      method: p.method,
      accountId: p.accountId,
      amount: Math.round(p.amount),
    }));
    if (change > 0) {
      const cashIdx = netPayments.findIndex((p) => p.method.toLowerCase().includes("cash"));
      if (cashIdx < 0) throw new ConvexError("Kembalian hanya bisa diberikan lewat metode Cash");
      netPayments[cashIdx].amount -= change;
    }

    let customerName = "Pelanggan Umum";
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (!customer || customer.companyId !== companyId) throw new ConvexError("Pelanggan tidak ditemukan");
      customerName = customer.name;
    }

    const number = await nextNumber(ctx, companyId, "POS");
    const invoiceId = await ctx.db.insert("salesInvoices", {
      companyId,
      number,
      date: args.date,
      customerId: args.customerId,
      customerName,
      memo: args.memo ?? "Transaksi kasir",
      subtotal,
      discountTotal: discount,
      taxTotal,
      total,
      paid: total,
      status: "paid",
      isPos: true,
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
          note: "Kasir POS",
        });
      }
    }

    const journalLines: Array<{ accountId: any; debit: number; credit: number; memo?: string }> = [];
    const receiptNumbers: string[] = [];
    for (const p of netPayments) {
      if (p.amount <= 0) continue;
      let accountId = p.accountId;
      if (!accountId) {
        accountId = p.method.toLowerCase().includes("cash") ? cashAccount : bankAccount;
      }
      const account = await ctx.db.get(accountId);
      if (!account || (account.kind !== "cash" && account.kind !== "bank")) {
        throw new ConvexError("Metode pembayaran harus memakai akun kas atau bank");
      }
      journalLines.push({ accountId, debit: p.amount, credit: 0, memo: p.method });

      const receiptNumber = await nextNumber(ctx, companyId, "RCV");
      receiptNumbers.push(receiptNumber);
      await ctx.db.insert("receipts", {
        companyId,
        number: receiptNumber,
        date: args.date,
        customerId: args.customerId,
        invoiceId,
        amount: p.amount,
        method: p.method,
        accountId,
        memo: "Pembayaran kasir",
        createdBy: userId,
      });
    }
    if (subtotal > 0) {
      journalLines.push({
        accountId: await findAccountByKind(ctx, companyId, "sales"),
        debit: 0,
        credit: subtotal,
      });
    }
    if (taxTotal > 0) {
      journalLines.push({
        accountId: await findAccountByKind(ctx, companyId, "tax_out"),
        debit: 0,
        credit: taxTotal,
      });
    }
    if (cogsTotal > 0) {
      journalLines.push({
        accountId: await findAccountByKind(ctx, companyId, "cogs"),
        debit: cogsTotal,
        credit: 0,
      });
      journalLines.push({
        accountId: await findAccountByKind(ctx, companyId, "inventory"),
        debit: 0,
        credit: cogsTotal,
      });
    }

    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `Kasir ${number} — ${customerName}`,
      sourceType: "POS",
      sourceNumber: number,
      userId,
      lines: journalLines,
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Penjualan POS",
      entityNumber: number,
      detail: `${customerName} • Rp ${total.toLocaleString("id-ID")}`,
    });

    return { invoiceId, number, total, change, receipts: receiptNumbers };
  },
});
