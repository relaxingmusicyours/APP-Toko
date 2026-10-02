import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { logAudit, nextNumber, postJournal } from "./lib/posting";

export const listCashTransactions = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    return ctx.db
      .query("cashTransactions")
      .withIndex("by_company_number", (q) => q.eq("companyId", tenant.companyId))
      .order("desc")
      .take(100);
  },
});

export const createCashTransaction = mutation({
  args: {
    date: v.string(),
    direction: v.union(v.literal("in"), v.literal("out"), v.literal("transfer")),
    amount: v.number(),
    accountId: v.id("accounts"),
    contraAccountId: v.id("accounts"),
    memo: v.string(),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const amount = Math.round(args.amount);
    if (amount <= 0) throw new ConvexError("Nominal harus lebih dari 0");
    if (args.direction === "transfer" && args.accountId === args.contraAccountId) {
      throw new ConvexError("Akun sumber dan tujuan transfer tidak boleh sama");
    }

    const account = await ctx.db.get(args.accountId);
    const contra = await ctx.db.get(args.contraAccountId);
    if (!account || account.companyId !== companyId) throw new ConvexError("Akun kas/bank tidak ditemukan");
    if (!contra || contra.companyId !== companyId) throw new ConvexError("Akun lawan tidak ditemukan");

    const number = await nextNumber(ctx, companyId, "CB");
    const lines =
      args.direction === "out"
        ? [
            { accountId: contra._id, debit: amount, credit: 0, memo: args.memo },
            { accountId: account._id, debit: 0, credit: amount, memo: account.name },
          ]
        : [
            { accountId: account._id, debit: amount, credit: 0, memo: args.memo },
            { accountId: contra._id, debit: 0, credit: amount, memo: contra.name },
          ];

    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `${number} — ${args.memo}`,
      sourceType: "CASH",
      sourceNumber: number,
      userId,
      lines,
    });

    await ctx.db.insert("cashTransactions", {
      companyId,
      number,
      date: args.date,
      direction: args.direction,
      amount,
      accountId: account._id,
      contraAccountId: contra._id,
      memo: args.memo,
      createdBy: userId,
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: args.direction === "transfer" ? "Transfer Kas/Bank" : args.direction === "in" ? "Penerimaan Kas/Bank" : "Pengeluaran Kas/Bank",
      entityNumber: number,
      detail: `${args.memo} • Rp ${amount.toLocaleString("id-ID")}`,
    });

    return { number };
  },
});
