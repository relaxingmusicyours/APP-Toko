import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { findAccountByKind, logAudit, nextNumber, postJournal } from "./lib/posting";

const METHOD_LABEL: Record<string, string> = {
  straight_line: "Garis Lurus",
  declining_balance: "Saldo Menurun",
};

function addMonths(month: string, count: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + count, 1));
  return date.toISOString().slice(0, 7);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Last calendar day of a YYYY-MM month. */
function lastDayOfMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/** Monthly depreciation amount, never below salvage value. */
function monthlyAmount(asset: {
  cost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  method: "straight_line" | "declining_balance";
  accumulatedDepreciation: number;
}): number {
  const bookValue = asset.cost - asset.accumulatedDepreciation;
  const floor = Math.max(asset.salvageValue, 0);
  if (bookValue <= floor) return 0;
  if (asset.usefulLifeMonths <= 0) return 0;

  if (asset.method === "declining_balance") {
    const rate = Math.min(2 / asset.usefulLifeMonths, 1);
    return Math.min(Math.round(bookValue * rate), bookValue - floor);
  }
  return Math.min(
    Math.round((asset.cost - asset.salvageValue) / asset.usefulLifeMonths),
    bookValue - floor,
  );
}

export const listAssets = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const assets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company_code", (q) => q.eq("companyId", tenant.companyId))
      .take(300);

    return assets.map((asset) => {
      const bookValue = asset.cost - asset.accumulatedDepreciation;
      const startMonth = addMonths(monthOf(asset.acquisitionDate), 1);
      return {
        ...asset,
        bookValue,
        methodLabel: METHOD_LABEL[asset.method] ?? asset.method,
        depreciationStartMonth: startMonth,
        nextDepreciation:
          asset.status === "active" ? monthlyAmount(asset) : 0,
        monthsDepreciated: asset.lastDepreciatedMonth
          ? Math.max(
              0,
              (Number(asset.lastDepreciatedMonth.slice(0, 4)) * 12 +
                Number(asset.lastDepreciatedMonth.slice(5, 7))) -
                (Number(startMonth.slice(0, 4)) * 12 + Number(startMonth.slice(5, 7))),
            )
          : 0,
      };
    });
  },
});

/** Depreciation journal history, newest first. */
export const depreciationHistory = query({
  args: { assetId: v.optional(v.id("fixedAssets")) },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const asset = args.assetId ? await ctx.db.get(args.assetId) : null;
    if (args.assetId && (!asset || asset.companyId !== tenant.companyId)) {
      throw new ConvexError("Aset tidak ditemukan");
    }

    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_company_date", (q) => q.eq("companyId", tenant.companyId))
      .order("desc")
      .take(300);

    const rows = [];
    for (const entry of entries) {
      if (entry.sourceType !== "DEPRECIATION" && entry.sourceType !== "ASSET_DISPOSAL") continue;
      if (asset && !entry.memo.includes(`[${asset.code}]`)) continue;
      const lines = await ctx.db
        .query("journalLines")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .take(10);
      rows.push({ ...entry, lines });
    }
    return rows.slice(0, 60);
  },
});

export const acquire = mutation({
  args: {
    name: v.string(),
    category: v.optional(v.string()),
    acquisitionDate: v.string(),
    cost: v.number(),
    salvageValue: v.optional(v.number()),
    usefulLifeMonths: v.number(),
    method: v.union(v.literal("straight_line"), v.literal("declining_balance")),
    location: v.optional(v.string()),
    fundAccountId: v.id("accounts"),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (!args.name.trim()) throw new ConvexError("Nama aset wajib diisi");
    const cost = Math.round(args.cost);
    if (cost <= 0) throw new ConvexError("Nilai perolehan harus lebih dari 0");
    if (args.usefulLifeMonths <= 0) throw new ConvexError("Masa manfaat harus lebih dari 0 bulan");
    const salvage = Math.max(Math.round(args.salvageValue ?? 0), 0);
    if (salvage >= cost) throw new ConvexError("Nilai sisa harus lebih kecil dari nilai perolehan");

    const fund = await ctx.db.get(args.fundAccountId);
    if (!fund || fund.companyId !== companyId) throw new ConvexError("Akun pendanaan tidak ditemukan");
    const allowed = ["cash", "bank", "payable"];
    if (!allowed.includes(fund.kind)) {
      throw new ConvexError("Pendanaan aset hanya dari Kas, Bank, atau Utang Usaha");
    }

    const code = await nextNumber(ctx, companyId, "FA");
    const assetId = await ctx.db.insert("fixedAssets", {
      companyId,
      code,
      name: args.name.trim(),
      category: args.category,
      acquisitionDate: args.acquisitionDate,
      cost,
      salvageValue: salvage,
      usefulLifeMonths: Math.round(args.usefulLifeMonths),
      method: args.method,
      location: args.location,
      accumulatedDepreciation: 0,
      status: "active",
      createdBy: userId,
      createdAt: Date.now(),
    });

    const fixedAssetAcc = await findAccountByKind(ctx, companyId, "fixed_asset");
    await postJournal(ctx, {
      companyId,
      date: args.acquisitionDate,
      memo: `Perolehan aset tetap [${code}] ${args.name.trim()}`,
      sourceType: "ASSET_ACQUISITION",
      sourceNumber: code,
      userId,
      lines: [
        { accountId: fixedAssetAcc, debit: cost, credit: 0, memo: args.name.trim() },
        { accountId: fund._id, debit: 0, credit: cost, memo: fund.name },
      ],
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Perolehan Aset Tetap",
      entityNumber: code,
      detail: `${args.name.trim()} • Rp ${cost.toLocaleString("id-ID")} • ${fund.name}`,
    });

    return { assetId, code };
  },
});

/**
 * Posts one depreciation journal per asset for the given month.
 * Idempotent: an asset already depreciated in that month is skipped.
 */
export const runDepreciation = mutation({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    if (!/^\d{4}-\d{2}$/.test(args.month)) throw new ConvexError("Format bulan harus YYYY-MM");

    const assets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .take(300);

    const expenseAcc = await findAccountByKind(ctx, companyId, "depreciation");
    const accumAcc = await findAccountByKind(ctx, companyId, "accum_dep");

    const processed: Array<{ code: string; name: string; amount: number }> = [];
    const skipped: string[] = [];

    for (const asset of assets) {
      if (asset.status !== "active") continue;
      const startMonth = addMonths(monthOf(asset.acquisitionDate), 1);
      if (args.month < startMonth) continue;
      if (asset.lastDepreciatedMonth && args.month <= asset.lastDepreciatedMonth) {
        skipped.push(asset.code);
        continue;
      }
      const amount = monthlyAmount(asset);
      if (amount <= 0) {
        skipped.push(asset.code);
        continue;
      }

      const accumulated = asset.accumulatedDepreciation + amount;
      const sourceNumber = `DEP-${args.month}-${asset.code}`;
      await ctx.db.patch(asset._id, {
        accumulatedDepreciation: accumulated,
        lastDepreciatedMonth: args.month,
      });
      await postJournal(ctx, {
        companyId,
        date: lastDayOfMonth(args.month),
        memo: `Penyusutan ${args.month} [${asset.code}] ${asset.name}`,
        sourceType: "DEPRECIATION",
        sourceNumber,
        userId,
        lines: [
          { accountId: expenseAcc, debit: amount, credit: 0, memo: asset.name },
          { accountId: accumAcc, debit: 0, credit: amount, memo: asset.name },
        ],
      });
      processed.push({ code: asset.code, name: asset.name, amount });
    }

    const total = processed.reduce((s, r) => s + r.amount, 0);
    if (processed.length > 0) {
      await logAudit(ctx, {
        companyId,
        userId,
        action: "POST",
        entity: "Penyusutan Aset Tetap",
        entityNumber: args.month,
        detail: `${processed.length} aset • Rp ${total.toLocaleString("id-ID")}`,
      });
    }

    return { month: args.month, processed, skipped, total };
  },
});

export const dispose = mutation({
  args: {
    assetId: v.id("fixedAssets"),
    date: v.string(),
    proceeds: v.number(),
    toAccountId: v.id("accounts"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.companyId !== companyId) throw new ConvexError("Aset tidak ditemukan");
    if (asset.status === "disposed") throw new ConvexError("Aset sudah dinonaktifkan");

    const proceeds = Math.max(Math.round(args.proceeds), 0);
    const toAccount = await ctx.db.get(args.toAccountId);
    if (!toAccount || toAccount.companyId !== companyId) throw new ConvexError("Akun tujuan tidak ditemukan");
    if (toAccount.kind !== "cash" && toAccount.kind !== "bank" && toAccount.kind !== "receivable") {
      throw new ConvexError("Hasil penjualan masuk ke Kas, Bank, atau Piutang");
    }

    const bookValue = asset.cost - asset.accumulatedDepreciation;
    const fixedAssetAcc = await findAccountByKind(ctx, companyId, "fixed_asset");
    const accumAcc = await findAccountByKind(ctx, companyId, "accum_dep");

    const lines: Array<{ accountId: any; debit: number; credit: number; memo?: string }> = [];
    if (asset.accumulatedDepreciation > 0) {
      lines.push({
        accountId: accumAcc,
        debit: asset.accumulatedDepreciation,
        credit: 0,
        memo: "Akumulasi penyusutan dihapus",
      });
    }
    if (proceeds > 0) {
      lines.push({ accountId: toAccount._id, debit: proceeds, credit: 0, memo: "Hasil penjualan aset" });
    }

    const gap = bookValue - proceeds;
    if (gap > 0) {
      const lossAcc = await findAccountByKind(ctx, companyId, "asset_disposal");
      lines.push({ accountId: lossAcc, debit: gap, credit: 0, memo: "Rugi penjualan aset" });
    } else if (gap < 0) {
      const gainAcc = await findAccountByKind(ctx, companyId, "other_income");
      lines.push({
        accountId: gainAcc,
        debit: 0,
        credit: Math.abs(gap),
        memo: "Laba penjualan aset",
      });
    }
    lines.push({
      accountId: fixedAssetAcc,
      debit: 0,
      credit: asset.cost,
      memo: "Aset keluar",
    });

    await postJournal(ctx, {
      companyId,
      date: args.date,
      memo: `Penjualan aset [${asset.code}] ${asset.name}${args.reason ? ` — ${args.reason}` : ""}`,
      sourceType: "ASSET_DISPOSAL",
      sourceNumber: asset.code,
      userId,
      lines,
    });

    await ctx.db.patch(asset._id, {
      status: "disposed",
      disposalDate: args.date,
      disposalProceeds: proceeds,
    });

    await logAudit(ctx, {
      companyId,
      userId,
      action: "POST",
      entity: "Penjualan Aset Tetap",
      entityNumber: asset.code,
      detail: `Nilai buku Rp ${bookValue.toLocaleString("id-ID")} • hasil Rp ${proceeds.toLocaleString("id-ID")}${
        gap > 0 ? " • rugi" : gap < 0 ? " • laba" : ""
      }`,
    });

    return { code: asset.code, bookValue, proceeds, result: gap > 0 ? "loss" : gap < 0 ? "gain" : "flat" };
  },
});

export const updateAsset = mutation({
  args: {
    assetId: v.id("fixedAssets"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    usefulLifeMonths: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.companyId !== companyId) throw new ConvexError("Aset tidak ditemukan");
    if (asset.status === "disposed") throw new ConvexError("Aset sudah dinonaktifkan");

    await ctx.db.patch(args.assetId, {
      name: args.name ?? asset.name,
      category: args.category ?? asset.category,
      location: args.location ?? asset.location,
      usefulLifeMonths: args.usefulLifeMonths ?? asset.usefulLifeMonths,
    });
    await logAudit(ctx, {
      companyId,
      userId,
      action: "UPDATE",
      entity: "Aset Tetap",
      entityNumber: asset.code,
      detail: "Perubahan data aset (tanpa jurnal)",
    });
  },
});
