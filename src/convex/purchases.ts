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

const OTHER_EXPENSE_CODE = "5-5400";

async function otherExpenseAccount(ctx: any, companyId: any) {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_company_code", (q: any) =>
      q.eq("companyId", companyId).eq("code", OTHER_EXPENSE_CODE),
    )
    .unique();
  if (!account) throw new ConvexError(`Akun ${OTHER_EXPENSE_CODE} tidak ditemukan`);
  return account._id;
}

export const listBills = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("purchaseBills")
      .withIndex("by_company_number", (q) => q.eq("companyId", tenant.companyId))
      .order("desc")
      .take(120);
  },
});

export const getBill = query({
  args: { billId: v.id("purchaseBills") },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const bill = await ctx.db.get(args.billId);
    if (!bill || bill.companyId !== tenant.companyId) return null;
    const lines = await ctx.db
      .query("purchaseBillLines")
      .withIndex("by_bill", (q) => q.eq("billId", bill._id))
      .take(100);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_bill", (q) => q.eq("billId", bill._id))
      .take(50);
    const entry = await ctx.db
      .query("journalEntries")
      .withIndex("by_company_source", (q) =>
        q.eq("companyId", tenant.companyId).eq("sourceNumber", bill.number),
      )
      .first();
    const entryLines = entry
      ? await ctx.db
          .query("journalLines")
          .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
          .take(50)
      : [];
    return { bill, lines, payments, entry: entry ? { ...entry, lines: entryLines } : null };
  },
});

export const createBill = mutation({
  args: {
    date: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    supplierName: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    memo: v.optional(v.string()),
    warehouseId: v.optional(v.id("warehouses")),
    lines: v.array(
      v.object({
        itemId: v.id("items"),
        qty: v.number(),
        price: v.number(),
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

    let stockSubtotal = 0;
    let expenseSubtotal = 0;
    let taxTotal = 0;

    const computed: Array<{
      itemId: typeof args.lines[number]["itemId"];
      sku: string;
      name: string;
      unit: string;
      qty: number;
      price: number;
      amount: number;
      tax: number;
      trackStock: boolean;
    }> = [];

    for (const line of args.lines) {
      if (line.qty <= 0) throw new ConvexError("Qty harus lebih dari 0");
      const item = await ctx.db.get(line.itemId);
      if (!item || item.companyId !== companyId) throw new ConvexError("Barang tidak ditemukan");
      const price = Math.round(line.price);
      const amount = Math.round(line.qty * price);
      const tax = Math.round((amount * item.taxRate) / 100);
      if (item.trackStock) stockSubtotal += amount;
      else expenseSubtotal += amount;
      taxTotal += tax;
      computed.push({
        itemId: item._id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        qty: line.qty,
        price,
        amount,
        tax,
        trackStock: item.trackStock,
      });
    }

    const subtotal = stockSubtotal + expenseSubtotal;
    const total = subtotal + taxTotal;

    let supplierName = args.supplierName?.trim();
    if (args.supplierId) {
      const supplier = await ctx.db.get(args.supplierId);
      if (!supplier || supplier.companyId !== companyId) throw new ConvexError("Pemasok tidak ditemukan");
      supplierName = supplier.name;
    }
    if (!supplierName) throw new ConvexError("Pilih pemasok atau isi nama pemasok");

    const number = await nextNumber(ctx, companyId, "BILL");
    const billId = await ctx.db.insert("purchaseBills", {
      companyId,
      number,
      date: args.date,
      supplierId: args.supplierId,
      supplierName,
      sourceRef: args.sourceRef,
      memo: args.memo,
      subtotal,
      taxTotal,
      total,
      paid: 0,
      status: "posted",
      createdBy: userId,
      createdAt: Date.now(),
    });

    for (const line of computed) {
      await ctx.db.insert("purchaseBillLines", {
        companyId,
        billId,
        itemId: line.itemId,
        sku: line.sku,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        price: line.price,
        amount: line.amount,
        trackStock: line.trackStock,
      });

      if (line.trackStock) {
        // Weighted average cost update before recording the receipt
        const item = await ctx.db.get(line.itemId);
        if (item) {
          const balances = await ctx.db
            .query("stockBalances")
            .withIndex("by_company_item", (q) =>
              q.eq("companyId", companyId).eq("itemId", item._id),
            )
            .take(50);
          const qtyBefore = balances.reduce((s, b) => s + b.qty, 0);
          const newCost =
            qtyBefore + line.qty > 0
              ? Math.round(
                  (qtyBefore * item.costPrice + line.qty * line.price) / (qtyBefore + line.qty),
                )
              : line.price;
          await ctx.db.patch(item._id, { costPrice: newCost });
        }

        await applyStockMove(ctx, {
          companyId,
          itemId: line.itemId,
          warehouseId,
          date: args.date,
          qty: line.qty,
          unitCost: line.price,
          refType: "PURCHASE",
          refNumber: number,
          note: `Pembelian ${supplierName}`,
        });
      }
    }

    const ap = await findAccountByKind(ctx, companyId, "payable");
    const lines: Array<{ accountId: any; debit: number; credit: number; memo?: string }> = [];
    if (stockSubtotal > 0) {
      const invAcc = await findAccountByKind(ctx, companyId, "inventory");
      lines.push({ accountId: invAcc, debit: stockSubtotal, credit: 0 });
    }
    if (expenseSubtotal > 0) {
      lines.push({ accountId: await otherExpenseAccount(ctx, companyId), debit: expenseSubtotal, credit: 0 });
    }
    if (taxTotal > 0) {
      const taxIn = await findAccountByKind(ctx, companyId, "tax_in");
      lines.push({ accountId: taxIn, debit: taxTotal, credit: 0 });
    }
    lines.push({ accountId: ap, debit: 0, credit: total, memo: supplierName });

    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `Faktur pembelian ${number} — ${supplierName}`,
      sourceType: "PURCHASE_BILL",
      sourceNumber: number,
      userId,
      lines,
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Faktur Pembelian",
      entityNumber: number,
      detail: `${supplierName} • Rp ${total.toLocaleString("id-ID")}`,
    });

    return { billId, number, total };
  },
});

export const recordPayment = mutation({
  args: {
    billId: v.id("purchaseBills"),
    date: v.string(),
    amount: v.number(),
    method: v.string(),
    accountId: v.id("accounts"),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const bill = await ctx.db.get(args.billId);
    if (!bill || bill.companyId !== companyId) throw new ConvexError("Faktur pembelian tidak ditemukan");
    if (bill.status === "void") throw new ConvexError("Faktur sudah dibatalkan");

    const amount = Math.round(args.amount);
    const remaining = bill.total - bill.paid;
    if (amount <= 0) throw new ConvexError("Nominal pembayaran harus lebih dari 0");
    if (amount > remaining) {
      throw new ConvexError(`Nominal melebihi sisa utang (Rp ${remaining.toLocaleString("id-ID")})`);
    }

    const account = await ctx.db.get(args.accountId);
    if (!account || account.companyId !== companyId) throw new ConvexError("Akun kas/bank tidak ditemukan");
    if (account.kind !== "cash" && account.kind !== "bank") throw new ConvexError("Pilih akun kas atau bank");

    const number = await nextNumber(ctx, companyId, "PAY");
    await ctx.db.insert("payments", {
      companyId,
      number,
      date: args.date,
      supplierId: bill.supplierId,
      billId: bill._id,
      amount,
      method: args.method,
      accountId: account._id,
      memo: args.memo,
      createdBy: userId,
    });

    const newPaid = bill.paid + amount;
    await ctx.db.patch(bill._id, {
      paid: newPaid,
      status: newPaid >= bill.total ? "paid" : "posted",
    });

    const ap = await findAccountByKind(ctx, companyId, "payable");
    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `Pembayaran ${number} — ${bill.number} (${bill.supplierName})`,
      sourceType: "PAYMENT",
      sourceNumber: number,
      userId,
      lines: [
        { accountId: ap, debit: amount, credit: 0 },
        { accountId: account._id, debit: 0, credit: amount, memo: args.method },
      ],
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Pembayaran Pembelian",
      entityNumber: number,
      detail: `${bill.number} • Rp ${amount.toLocaleString("id-ID")} via ${args.method}`,
    });

    return { number, remaining: bill.total - newPaid };
  },
});

export const voidBill = mutation({
  args: { billId: v.id("purchaseBills"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const bill = await ctx.db.get(args.billId);
    if (!bill || bill.companyId !== companyId) throw new ConvexError("Faktur pembelian tidak ditemukan");
    if (bill.status === "void") return null;
    if (bill.paid > 0) throw new ConvexError("Faktur sudah dibayar sebagian. Buat jurnal koreksi manual.");

    const entry = await ctx.db
      .query("journalEntries")
      .withIndex("by_company_source", (q) =>
        q.eq("companyId", companyId).eq("sourceNumber", bill.number),
      )
      .first();
    if (entry) {
      const entryLines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .take(50);
      await postJournal(ctx, {
        companyId,
        date: bill.date,
        memo: `Void ${bill.number} — ${args.reason ?? "pembatalan faktur pembelian"}`,
        sourceType: "VOID_PURCHASE_BILL",
        sourceNumber: bill.number,
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
        q.eq("companyId", companyId).eq("refType", "PURCHASE").eq("refNumber", bill.number),
      )
      .take(200);
    for (const m of movements) {
      await applyStockMove(ctx, {
        companyId,
        itemId: m.itemId,
        warehouseId: m.warehouseId,
        date: bill.date,
        qty: -m.qty,
        unitCost: m.unitCost,
        refType: "PURCHASE_VOID",
        refNumber: bill.number,
        note: "Pembatalan faktur pembelian",
      });
    }

    await ctx.db.patch(bill._id, { status: "void" });
    await logAudit(ctx, {
      companyId,
      userId,
      action: "VOID",
      entity: "Faktur Pembelian",
      entityNumber: bill.number,
      detail: args.reason,
    });
    return null;
  },
});
