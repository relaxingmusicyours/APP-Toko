import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { currentCompany } from "./lib/context";

type Line = Doc<"journalLines">;

async function companyLines(ctx: QueryCtx, companyId: Id<"companies">): Promise<Line[]> {
  return ctx.db
    .query("journalLines")
    .withIndex("by_company_account", (q) => q.eq("companyId", companyId))
    .take(8000);
}

async function companyAccounts(ctx: QueryCtx, companyId: Id<"companies">) {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(300);
  return accounts.sort((a, b) => a.code.localeCompare(b.code));
}

function inRange(line: Line, from?: string, to?: string) {
  if (from && line.date < from) return false;
  if (to && line.date > to) return false;
  return true;
}

function monthKeys(count: number, endMonth: string): string[] {
  const [y, m] = endMonth.split("-").map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(date.toISOString().slice(0, 7));
  }
  return keys;
}

export const dashboard = query({
  args: { month: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const { companyId } = tenant;

    const accounts = await companyAccounts(ctx, companyId);
    const lines = await companyLines(ctx, companyId);

    const balanceByAccount = new Map<string, { debit: number; credit: number }>();
    for (const line of lines) {
      const current = balanceByAccount.get(line.accountId) ?? { debit: 0, credit: 0 };
      current.debit += line.debit;
      current.credit += line.credit;
      balanceByAccount.set(line.accountId, current);
    }

    const cashAccounts = accounts.filter((a) => a.kind === "cash" || a.kind === "bank");
    const cashTotal = cashAccounts.reduce((sum, a) => {
      const b = balanceByAccount.get(a._id);
      return sum + ((b?.debit ?? 0) - (b?.credit ?? 0));
    }, 0);

    const cashBreakdown = cashAccounts.map((a) => {
      const b = balanceByAccount.get(a._id);
      return {
        _id: a._id,
        code: a.code,
        name: a.name,
        kind: a.kind,
        balance: (b?.debit ?? 0) - (b?.credit ?? 0),
      };
    });

    const monthLines = lines.filter((l) => l.date.startsWith(args.month));
    let revenue = 0;
    let expense = 0;
    for (const line of monthLines) {
      const account = accounts.find((a) => a._id === line.accountId);
      if (!account) continue;
      if (account.type === "revenue") revenue += line.credit - line.debit;
      if (account.type === "expense") expense += line.debit - line.credit;
    }

    const invoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_company_number", (q) => q.eq("companyId", companyId))
      .order("desc")
      .take(300);
    const bills = await ctx.db
      .query("purchaseBills")
      .withIndex("by_company_number", (q) => q.eq("companyId", companyId))
      .order("desc")
      .take(300);

    const activeInvoices = invoices.filter((i) => i.status !== "void");
    const activeBills = bills.filter((b) => b.status !== "void");

    const monthSales = activeInvoices
      .filter((i) => i.date.startsWith(args.month))
      .reduce((s, i) => s + i.total, 0);
    const monthPurchases = activeBills
      .filter((b) => b.date.startsWith(args.month))
      .reduce((s, b) => s + b.total, 0);
    const arOutstanding = activeInvoices
      .filter((i) => i.status === "posted")
      .reduce((s, i) => s + (i.total - i.paid), 0);
    const apOutstanding = activeBills
      .filter((b) => b.status === "posted")
      .reduce((s, b) => s + (b.total - b.paid), 0);

    const months = monthKeys(6, args.month);
    const series = months.map((month) => ({
      month,
      label: month.slice(5) + "/" + month.slice(2, 4),
      penjualan: activeInvoices.filter((i) => i.date.startsWith(month)).reduce((s, i) => s + i.total, 0),
      pembelian: activeBills.filter((b) => b.date.startsWith(month)).reduce((s, b) => s + b.total, 0),
    }));

    const items = await ctx.db
      .query("items")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .take(500);
    const balances = await ctx.db
      .query("stockBalances")
      .withIndex("by_company_item", (q) => q.eq("companyId", companyId))
      .take(2000);
    const qtyByItem = new Map<string, number>();
    for (const b of balances) qtyByItem.set(b.itemId, (qtyByItem.get(b.itemId) ?? 0) + b.qty);
    const lowStock = items
      .filter((i) => i.trackStock && (qtyByItem.get(i._id) ?? 0) <= i.minStock)
      .map((i) => ({
        _id: i._id,
        sku: i.sku,
        name: i.name,
        unit: i.unit,
        qty: qtyByItem.get(i._id) ?? 0,
        minStock: i.minStock,
      }))
      .slice(0, 6);

    const inventoryValue = items.reduce(
      (s, i) => s + (qtyByItem.get(i._id) ?? 0) * i.costPrice,
      0,
    );

    return {
      cashTotal,
      cashBreakdown,
      revenue,
      expense,
      profit: revenue - expense,
      monthSales,
      monthPurchases,
      arOutstanding,
      apOutstanding,
      inventoryValue,
      series,
      lowStock,
      recentInvoices: activeInvoices.slice(0, 6),
      counts: {
        invoices: activeInvoices.length,
        bills: activeBills.length,
        items: items.length,
        openInvoices: activeInvoices.filter((i) => i.status === "posted").length,
      },
    };
  },
});

export const trialBalance = query({
  args: { to: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const accounts = await companyAccounts(ctx, tenant.companyId);
    const lines = (await companyLines(ctx, tenant.companyId)).filter((l) => inRange(l, undefined, args.to));

    const rows = accounts.map((account) => {
      const own = lines.filter((l) => l.accountId === account._id);
      const debit = own.reduce((s, l) => s + l.debit, 0);
      const credit = own.reduce((s, l) => s + l.credit, 0);
      return {
        _id: account._id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit,
        credit,
        balance: debit - credit,
      };
    });

    return {
      rows: rows.filter((r) => r.debit !== 0 || r.credit !== 0),
      totalDebit: rows.reduce((s, r) => s + r.debit, 0),
      totalCredit: rows.reduce((s, r) => s + r.credit, 0),
    };
  },
});

export const profitLoss = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const accounts = await companyAccounts(ctx, tenant.companyId);
    const lines = (await companyLines(ctx, tenant.companyId)).filter((l) =>
      inRange(l, args.from, args.to),
    );

    const build = (type: "revenue" | "expense") =>
      accounts
        .filter((a) => a.type === type)
        .map((account) => {
          const own = lines.filter((l) => l.accountId === account._id);
          const debit = own.reduce((s, l) => s + l.debit, 0);
          const credit = own.reduce((s, l) => s + l.credit, 0);
          return {
            _id: account._id,
            code: account.code,
            name: account.name,
            amount: type === "revenue" ? credit - debit : debit - credit,
          };
        })
        .filter((r) => r.amount !== 0);

    const revenues = build("revenue");
    const expenses = build("expense");
    const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);

    return { revenues, expenses, totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense };
  },
});

export const balanceSheet = query({
  args: { to: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const accounts = await companyAccounts(ctx, tenant.companyId);
    const lines = (await companyLines(ctx, tenant.companyId)).filter((l) => inRange(l, undefined, args.to));

    const build = (type: "asset" | "liability" | "equity") =>
      accounts
        .filter((a) => a.type === type)
        .map((account) => {
          const own = lines.filter((l) => l.accountId === account._id);
          const debit = own.reduce((s, l) => s + l.debit, 0);
          const credit = own.reduce((s, l) => s + l.credit, 0);
          return {
            _id: account._id,
            code: account.code,
            name: account.name,
            amount: type === "asset" ? debit - credit : credit - debit,
          };
        })
        .filter((r) => r.amount !== 0);

    const assets = build("asset");
    const liabilities = build("liability");
    const equity = build("equity");

    let revenue = 0;
    let expense = 0;
    for (const line of lines) {
      const account = accounts.find((a) => a._id === line.accountId);
      if (!account) continue;
      if (account.type === "revenue") revenue += line.credit - line.debit;
      if (account.type === "expense") expense += line.debit - line.credit;
    }
    const earnings = revenue - expense;

    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
    const totalEquity = equity.reduce((s, r) => s + r.amount, 0) + earnings;

    return {
      assets,
      liabilities,
      equity,
      earnings,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesEquity: totalLiabilities + totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    };
  },
});

export const cashFlow = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const accounts = await companyAccounts(ctx, tenant.companyId);
    const cashAccounts = accounts.filter((a) => a.kind === "cash" || a.kind === "bank");
    const lines = await companyLines(ctx, tenant.companyId);

    const rows = cashAccounts.map((account) => {
      const own = lines.filter((l) => l.accountId === account._id);
      const opening = own
        .filter((l) => l.date < args.from)
        .reduce((s, l) => s + l.debit - l.credit, 0);
      const inflow = own
        .filter((l) => inRange(l, args.from, args.to))
        .reduce((s, l) => s + l.debit, 0);
      const outflow = own
        .filter((l) => inRange(l, args.from, args.to))
        .reduce((s, l) => s + l.credit, 0);
      return {
        _id: account._id,
        code: account.code,
        name: account.name,
        kind: account.kind,
        opening,
        inflow,
        outflow,
        closing: opening + inflow - outflow,
      };
    });

    return {
      rows,
      totalOpening: rows.reduce((s, r) => s + r.opening, 0),
      totalInflow: rows.reduce((s, r) => s + r.inflow, 0),
      totalOutflow: rows.reduce((s, r) => s + r.outflow, 0),
      totalClosing: rows.reduce((s, r) => s + r.closing, 0),
    };
  },
});

// ---------------------------------------------------------------------------
// Extended report engine — aging, per-party, per-product, tax & asset reports
// ---------------------------------------------------------------------------

function daysBetween(fromISO: string, toISO: string): number {
  return Math.floor((Date.parse(toISO) - Date.parse(fromISO)) / 86_400_000);
}

type AgingRow = {
  key: string;
  name: string;
  count: number;
  d0_14: number;
  d15_30: number;
  d30plus: number;
  oldest: number;
  total: number;
};

function bucketKey(days: number): "d0_14" | "d15_30" | "d30plus" {
  if (days > 30) return "d30plus";
  if (days > 14) return "d15_30";
  return "d0_14";
}

function buildAging(
  docs: Array<{ key: string; name: string; dueDate: string; outstanding: number }>,
  asOf: string,
) {
  const byParty = new Map<string, AgingRow>();
  for (const doc of docs) {
    const days = Math.max(0, daysBetween(doc.dueDate, asOf));
    const bucket = bucketKey(days);
    const row: AgingRow =
      byParty.get(doc.key) ??
      { key: doc.key, name: doc.name, count: 0, d0_14: 0, d15_30: 0, d30plus: 0, oldest: 0, total: 0 };
    row.count += 1;
    row[bucket] += doc.outstanding;
    row.total += doc.outstanding;
    row.oldest = Math.max(row.oldest, days);
    byParty.set(doc.key, row);
  }
  const rows = [...byParty.values()].sort((a, b) => b.total - a.total);
  return {
    asOf,
    rows,
    totals: {
      count: rows.reduce((s, r) => s + r.count, 0),
      d0_14: rows.reduce((s, r) => s + r.d0_14, 0),
      d15_30: rows.reduce((s, r) => s + r.d15_30, 0),
      d30plus: rows.reduce((s, r) => s + r.d30plus, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
    },
  };
}

/** AR aging: outstanding customer invoices grouped by days past due (0-14 / 15-30 / 30+). */
export const arAging = query({
  args: { asOf: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const invoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);
    const docs = invoices
      .filter((i) => i.status === "posted" && i.total - i.paid > 0)
      .map((i) => ({
        key: i.customerId ?? i.customerName,
        name: i.customerName,
        dueDate: i.dueDate ?? i.date,
        outstanding: i.total - i.paid,
      }));
    return buildAging(docs, args.asOf);
  },
});

/** AP aging: outstanding supplier bills grouped by document age. */
export const apAging = query({
  args: { asOf: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const bills = await ctx.db
      .query("purchaseBills")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);
    const docs = bills
      .filter((b) => b.status === "posted" && b.total - b.paid > 0)
      .map((b) => ({
        key: b.supplierId ?? b.supplierName,
        name: b.supplierName,
        dueDate: b.date,
        outstanding: b.total - b.paid,
      }));
    return buildAging(docs, args.asOf);
  },
});

/** Sales per customer within a period, net of returns. */
export const salesByCustomer = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const invoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);
    const returns = await ctx.db
      .query("salesReturns")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(500);

    type Row = { key: string; name: string; invoiceCount: number; gross: number; returns: number; net: number };
    const byCustomer = new Map<string, Row>();
    const rowFor = (key: string, name: string) => {
      let row = byCustomer.get(key);
      if (!row) {
        row = { key, name, invoiceCount: 0, gross: 0, returns: 0, net: 0 };
        byCustomer.set(key, row);
      }
      return row;
    };

    for (const inv of invoices) {
      if (inv.status === "void" || inv.date < args.from || inv.date > args.to) continue;
      const row = rowFor(inv.customerId ?? inv.customerName, inv.customerName);
      row.invoiceCount += 1;
      row.gross += inv.total;
    }
    for (const ret of returns) {
      if (ret.date < args.from || ret.date > args.to) continue;
      const row = rowFor(ret.customerId ?? ret.customerName, ret.customerName);
      row.returns += ret.total;
    }

    const rows = [...byCustomer.values()]
      .map((r) => ({ ...r, net: r.gross - r.returns }))
      .filter((r) => r.gross !== 0 || r.returns !== 0)
      .sort((a, b) => b.net - a.net);

    return {
      rows,
      totals: {
        invoiceCount: rows.reduce((s, r) => s + r.invoiceCount, 0),
        gross: rows.reduce((s, r) => s + r.gross, 0),
        returns: rows.reduce((s, r) => s + r.returns, 0),
        net: rows.reduce((s, r) => s + r.net, 0),
      },
    };
  },
});

/** Sales per product (SKU): qty, revenue, COGS, returns and gross profit. */
export const salesByProduct = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const invoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);
    const active = invoices.filter((i) => i.status !== "void" && i.date >= args.from && i.date <= args.to);

    type Row = {
      sku: string;
      name: string;
      unit: string;
      qty: number;
      sales: number;
      cogs: number;
      returnsQty: number;
      returns: number;
      returnsCost: number;
    };
    const bySku = new Map<string, Row>();
    const rowFor = (sku: string, name: string, unit: string) => {
      let row = bySku.get(sku);
      if (!row) {
        row = { sku, name, unit, qty: 0, sales: 0, cogs: 0, returnsQty: 0, returns: 0, returnsCost: 0 };
        bySku.set(sku, row);
      }
      return row;
    };

    for (const inv of active) {
      const lines = await ctx.db
        .query("salesInvoiceLines")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", inv._id))
        .take(200);
      for (const line of lines) {
        const row = rowFor(line.sku, line.name, line.unit);
        row.qty += line.qty;
        row.sales += line.amount;
        row.cogs += Math.round(line.qty * line.cost);
      }
    }

    const returns = await ctx.db
      .query("salesReturns")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(500);
    const activeReturns = returns.filter((r) => r.date >= args.from && r.date <= args.to);
    for (const ret of activeReturns) {
      const lines = await ctx.db
        .query("salesReturnLines")
        .withIndex("by_return", (q) => q.eq("returnId", ret._id))
        .take(200);
      for (const line of lines) {
        const row = rowFor(line.sku, line.name, line.unit);
        row.returnsQty += line.qty;
        row.returns += line.amount;
        row.returnsCost += Math.round(line.qty * line.cost);
      }
    }

    const rows = [...bySku.values()]
      .map((r) => ({
        ...r,
        profit: r.sales - r.returns - (r.cogs - r.returnsCost),
      }))
      .filter((r) => r.qty !== 0 || r.sales !== 0 || r.returns !== 0)
      .sort((a, b) => b.sales - a.sales);

    return {
      rows,
      totals: {
        qty: rows.reduce((s, r) => s + r.qty, 0),
        sales: rows.reduce((s, r) => s + r.sales, 0),
        cogs: rows.reduce((s, r) => s + r.cogs, 0),
        returns: rows.reduce((s, r) => s + r.returns, 0),
        profit: rows.reduce((s, r) => s + r.profit, 0),
      },
    };
  },
});

/** Purchases per supplier within a period. */
export const purchasesBySupplier = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const bills = await ctx.db
      .query("purchaseBills")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);

    type Row = { key: string; name: string; billCount: number; gross: number };
    const bySupplier = new Map<string, Row>();
    for (const bill of bills) {
      if (bill.status === "void" || bill.date < args.from || bill.date > args.to) continue;
      const key = bill.supplierId ?? bill.supplierName;
      const row = bySupplier.get(key) ?? { key, name: bill.supplierName, billCount: 0, gross: 0 };
      row.billCount += 1;
      row.gross += bill.total;
      bySupplier.set(key, row);
    }

    const rows = [...bySupplier.values()].sort((a, b) => b.gross - a.gross);
    return {
      rows,
      totals: {
        billCount: rows.reduce((s, r) => s + r.billCount, 0),
        gross: rows.reduce((s, r) => s + r.gross, 0),
      },
    };
  },
});

/** VAT (PPN) summary: output tax from sales net of returns, input tax from purchases. */
export const taxSummary = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const invoices = await ctx.db
      .query("salesInvoices")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);
    const returns = await ctx.db
      .query("salesReturns")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(500);
    const bills = await ctx.db
      .query("purchaseBills")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(2000);

    const inRange = (date: string) => date >= args.from && date <= args.to;

    let outputBase = 0;
    let outputTax = 0;
    let outputInvoiceCount = 0;
    let returnsBase = 0;
    let returnsTax = 0;
    let returnCount = 0;
    let inputBase = 0;
    let inputTax = 0;
    let inputBillCount = 0;

    for (const inv of invoices) {
      if (inv.status === "void" || !inRange(inv.date)) continue;
      outputBase += inv.subtotal;
      outputTax += inv.taxTotal;
      outputInvoiceCount += 1;
    }
    for (const ret of returns) {
      if (!inRange(ret.date)) continue;
      returnsBase += ret.subtotal;
      returnsTax += ret.taxTotal;
      returnCount += 1;
    }
    for (const bill of bills) {
      if (bill.status === "void" || !inRange(bill.date)) continue;
      inputBase += bill.subtotal;
      inputTax += bill.taxTotal;
      inputBillCount += 1;
    }

    const netBase = outputBase - returnsBase;
    const netTax = outputTax - returnsTax;

    return {
      output: { base: outputBase, tax: outputTax, invoiceCount: outputInvoiceCount },
      returns: { base: returnsBase, tax: returnsTax, count: returnCount },
      outputNet: { base: netBase, tax: netTax },
      input: { base: inputBase, tax: inputTax, billCount: inputBillCount },
      payable: netTax - inputTax,
    };
  },
});

/** Fixed asset register with book values and disposal status. */
export const assetRegister = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return null;
    const assets = await ctx.db
      .query("fixedAssets")
      .withIndex("by_company_code", (q) => q.eq("companyId", tenant.companyId))
      .take(300);

    const rows = assets.map((asset) => ({
      ...asset,
      bookValue: asset.cost - asset.accumulatedDepreciation,
    }));
    const active = rows.filter((r) => r.status === "active");
    return {
      rows,
      summary: {
        activeCount: active.length,
        disposedCount: rows.length - active.length,
        totalCost: active.reduce((s, r) => s + r.cost, 0),
        totalAccumulated: active.reduce((s, r) => s + r.accumulatedDepreciation, 0),
        totalBookValue: active.reduce((s, r) => s + r.bookValue, 0),
      },
    };
  },
});
