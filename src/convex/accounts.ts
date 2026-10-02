import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentCompany, requireCompany } from "./lib/context";
import { logAudit } from "./lib/posting";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(300);
    return accounts.sort((a, b) => a.code.localeCompare(b.code));
  },
});

export const cashBankAccounts = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await currentCompany(ctx);
    if (!tenant) return [];
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_company", (q) => q.eq("companyId", tenant.companyId))
      .take(300);
    return accounts
      .filter((a) => a.kind === "cash" || a.kind === "bank")
      .sort((a, b) => a.code.localeCompare(b.code));
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("revenue"),
      v.literal("expense"),
    ),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const code = args.code.trim();
    if (!code || !args.name.trim()) throw new ConvexError("Kode dan nama akun wajib diisi");
    const duplicate = await ctx.db
      .query("accounts")
      .withIndex("by_company_code", (q) => q.eq("companyId", companyId).eq("code", code))
      .unique();
    if (duplicate) throw new ConvexError(`Kode akun ${code} sudah dipakai`);
    const id = await ctx.db.insert("accounts", {
      companyId,
      code,
      name: args.name.trim(),
      type: args.type,
      kind: args.kind ?? "other",
      isSystem: false,
      isActive: true,
    });
    await logAudit(ctx, {
      companyId,
      userId,
      action: "CREATE",
      entity: "Akun",
      entityNumber: code,
      detail: args.name,
    });
    return id;
  },
});

export const toggleActive = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, args) => {
    const { companyId, userId } = await requireCompany(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account || account.companyId !== companyId) throw new ConvexError("Akun tidak ditemukan");
    if (account.isSystem) throw new ConvexError("Akun sistem tidak bisa dinonaktifkan");
    await ctx.db.patch(args.accountId, { isActive: !account.isActive });
    await logAudit(ctx, {
      companyId,
      userId,
      action: "UPDATE",
      entity: "Akun",
      entityNumber: account.code,
      detail: account.isActive ? "Nonaktifkan akun" : "Aktifkan akun",
    });
  },
});
