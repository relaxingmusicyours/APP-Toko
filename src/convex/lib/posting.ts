import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export type AnyCtx = MutationCtx | QueryCtx;

export function round(value: number): number {
  return Math.round(value);
}

/** Sequential document numbering per company, e.g. INV-0001 */
export async function nextNumber(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  prefix: string,
): Promise<string> {
  const row = await ctx.db
    .query("counters")
    .withIndex("by_company_key", (q) => q.eq("companyId", companyId).eq("key", prefix))
    .unique();
  const value = (row?.value ?? 0) + 1;
  if (row) {
    await ctx.db.patch(row._id, { value });
  } else {
    await ctx.db.insert("counters", { companyId, key: prefix, value });
  }
  return `${prefix}-${String(value).padStart(4, "0")}`;
}

export async function findAccountByKind(
  ctx: AnyCtx,
  companyId: Id<"companies">,
  kind: string,
): Promise<Id<"accounts">> {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .filter((q) => q.eq(q.field("kind"), kind))
    .first();
  if (!account) throw new ConvexError(`Akun dengan peran "${kind}" belum ada di Chart of Accounts`);
  return account._id;
}

export interface JournalLineInput {
  accountId: Id<"accounts">;
  debit: number;
  credit: number;
  memo?: string;
}

export interface PostJournalArgs {
  companyId: Id<"companies">;
  date: string;
  memo: string;
  sourceType: string;
  sourceNumber?: string;
  lines: JournalLineInput[];
  userId?: Id<"users">;
}

/**
 * Single entry point for the double-entry engine.
 * Every business document must post through here so the ledger stays auditable.
 */
export async function postJournal(ctx: MutationCtx, args: PostJournalArgs) {
  const lines = args.lines
    .map((l) => ({
      accountId: l.accountId,
      debit: round(l.debit ?? 0),
      credit: round(l.credit ?? 0),
      memo: l.memo,
    }))
    .filter((l) => l.debit !== 0 || l.credit !== 0);

  if (lines.length < 2) {
    throw new ConvexError("Jurnal butuh minimal dua baris (debit & kredit)");
  }
  if (lines.some((l) => l.debit < 0 || l.credit < 0)) {
    throw new ConvexError("Nilai debit/kredit tidak boleh negatif");
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (totalDebit !== totalCredit) {
    throw new ConvexError(
      `Jurnal tidak seimbang: debit ${totalDebit} ≠ kredit ${totalCredit}`,
    );
  }

  const number = await nextNumber(ctx, args.companyId, "JV");
  const entryId = await ctx.db.insert("journalEntries", {
    companyId: args.companyId,
    number,
    date: args.date,
    memo: args.memo,
    sourceType: args.sourceType,
    sourceNumber: args.sourceNumber,
    totalDebit,
    totalCredit,
    createdBy: args.userId,
    createdAt: Date.now(),
  });

  for (const line of lines) {
    const account = await ctx.db.get(line.accountId);
    if (!account) throw new ConvexError("Akun jurnal tidak ditemukan");
    await ctx.db.insert("journalLines", {
      companyId: args.companyId,
      entryId,
      date: args.date,
      accountId: line.accountId,
      accountCode: account.code,
      accountName: account.name,
      debit: line.debit,
      credit: line.credit,
      memo: line.memo,
    });
  }

  return { entryId, number, totalDebit, totalCredit };
}

export async function logAudit(
  ctx: MutationCtx,
  args: {
    companyId: Id<"companies">;
    userId?: Id<"users">;
    action: string;
    entity: string;
    entityNumber?: string;
    detail?: string;
  },
) {
  let userName: string | undefined;
  if (args.userId) {
    const user = await ctx.db.get(args.userId);
    userName = user?.name || user?.email || undefined;
  }
  await ctx.db.insert("auditLogs", {
    companyId: args.companyId,
    userId: args.userId,
    userName,
    action: args.action,
    entity: args.entity,
    entityNumber: args.entityNumber,
    detail: args.detail,
    createdAt: Date.now(),
  });
}

/** Append a stock ledger row and refresh the fast-read balance. */
export async function applyStockMove(
  ctx: MutationCtx,
  args: {
    companyId: Id<"companies">;
    itemId: Id<"items">;
    warehouseId: Id<"warehouses">;
    date: string;
    qty: number;
    unitCost: number;
    refType: string;
    refNumber?: string;
    note?: string;
  },
) {
  await ctx.db.insert("stockMovements", {
    companyId: args.companyId,
    itemId: args.itemId,
    warehouseId: args.warehouseId,
    date: args.date,
    qty: args.qty,
    unitCost: args.unitCost,
    totalCost: round(args.qty * args.unitCost),
    refType: args.refType,
    refNumber: args.refNumber,
    note: args.note,
  });

  const balance = await ctx.db
    .query("stockBalances")
    .withIndex("by_company_item", (q) =>
      q.eq("companyId", args.companyId).eq("itemId", args.itemId),
    )
    .filter((q) => q.eq(q.field("warehouseId"), args.warehouseId))
    .first();

  if (balance) {
    await ctx.db.patch(balance._id, { qty: balance.qty + args.qty });
  } else {
    await ctx.db.insert("stockBalances", {
      companyId: args.companyId,
      itemId: args.itemId,
      warehouseId: args.warehouseId,
      qty: args.qty,
    });
  }
}

export async function requireUser(ctx: AnyCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sesi berakhir, silakan masuk kembali");
  return userId as Id<"users">;
}
