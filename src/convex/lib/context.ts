import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export interface TenantContext {
  company: Doc<"companies">;
  companyId: Id<"companies">;
  userId: Id<"users">;
}

export async function currentCompany(ctx: MutationCtx | QueryCtx): Promise<TenantContext | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const company = await ctx.db
    .query("companies")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId as Id<"users">))
    .first();
  if (!company) return null;
  return { company, companyId: company._id, userId: userId as Id<"users"> };
}

export async function requireCompany(ctx: MutationCtx): Promise<TenantContext> {
  const tenant = await currentCompany(ctx);
  if (!tenant) throw new ConvexError("Tenant belum siap. Muat ulang halaman untuk inisialisasi.");
  return tenant;
}
