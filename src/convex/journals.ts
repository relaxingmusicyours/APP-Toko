import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { logAudit, postJournal } from "./lib/posting";

export const listEntries = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_company_number", (q) => q.eq("companyId", tenant.companyId))
      .order("desc")
      .take(80);
    const withLines = [];
    for (const entry of entries) {
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .take(30);
      withLines.push({ ...entry, lines });
    }
    return withLines;
  },
});

export const createManual = mutation({
  args: {
    date: v.string(),
    memo: v.string(),
    lines: v.array(
      v.object({
        accountId: v.id("accounts"),
        debit: v.number(),
        credit: v.number(),
        memo: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (!args.memo.trim()) throw new ConvexError("Keterangan jurnal wajib diisi");
    for (const line of args.lines) {
      const account = await ctx.db.get(line.accountId);
      if (!account || account.companyId !== companyId) throw new ConvexError("Akun tidak valid");
    }
    const result = await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: args.memo.trim(),
      sourceType: "MANUAL",
      userId,
      lines: args.lines,
    });
    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Jurnal Manual",
      entityNumber: result.number,
      detail: args.memo,
    });
    return result;
  },
});

export interface LedgerRow {
  date: string;
  entryNumber: string;
  memo: string;
  debit: number;
  credit: number;
  balance: number;
}

export const accountLedger = query({
  args: {
    accountId: v.id("accounts"),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    normalBalance: v.union(v.literal("debit"), v.literal("credit")),
  },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return { rows: [], opening: 0, totalDebit: 0, totalCredit: 0 };
    const account = await ctx.db.get(args.accountId);
    if (!account || account.companyId !== tenant.companyId) {
      throw new ConvexError("Akun tidak ditemukan");
    }

    const lines = await ctx.db
      .query("journalLines")
      .withIndex("by_company_account", (q) =>
        q.eq("companyId", tenant.companyId).eq("accountId", args.accountId),
      )
      .take(5000);

    let opening = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const raw: Array<{ date: string; entryNumber: string; memo: string; debit: number; credit: number }> = [];

    for (const line of lines) {
      const entry = await ctx.db.get(line.entryId);
      if (!entry) continue;
      if (args.from && line.date < args.from) {
        opening += line.debit - line.credit;
        continue;
      }
      if (args.to && line.date > args.to) continue;
      totalDebit += line.debit;
      totalCredit += line.credit;
      raw.push({
        date: line.date,
        entryNumber: entry.number,
        memo: line.memo ?? entry.memo,
        debit: line.debit,
        credit: line.credit,
      });
    }

    raw.sort((a, b) => (a.date === b.date ? a.entryNumber.localeCompare(b.entryNumber) : a.date.localeCompare(b.date)));

    let running = opening;
    const rows: LedgerRow[] = raw.map((r) => {
      running += r.debit - r.credit;
      return { ...r, balance: running };
    });

    const signed =
      args.normalBalance === "debit"
        ? { opening, closing: opening + totalDebit - totalCredit }
        : { opening: -opening, closing: -(opening + totalDebit - totalCredit) };

    return { rows, opening: signed.opening, totalDebit, totalCredit, closing: signed.closing };
  },
});
