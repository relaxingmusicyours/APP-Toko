import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),

  companies: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    taxId: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    seeded: v.boolean(),
  }).index("by_owner", ["ownerId"]),

  // Chart of accounts
  accounts: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("asset"),
      v.literal("liability"),
      v.literal("equity"),
      v.literal("revenue"),
      v.literal("expense"),
    ),
    // cash | bank | receivable | payable | inventory | tax_in | tax_out | sales | cogs | equity | other
    kind: v.string(),
    isSystem: v.boolean(),
    isActive: v.boolean(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"]),

  warehouses: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    name: v.string(),
    location: v.optional(v.string()),
  }).index("by_company", ["companyId"]),

  customers: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_company", ["companyId"]),

  suppliers: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_company", ["companyId"]),

  items: defineTable({
    companyId: v.id("companies"),
    sku: v.string(),
    name: v.string(),
    category: v.optional(v.string()),
    unit: v.string(),
    salePrice: v.number(),
    costPrice: v.number(),
    taxRate: v.number(),
    trackStock: v.boolean(),
    minStock: v.number(),
    isActive: v.boolean(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_sku", ["companyId", "sku"]),

  salesInvoices: defineTable({
    companyId: v.id("companies"),
    number: v.string(),
    date: v.string(), // YYYY-MM-DD
    dueDate: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    customerName: v.string(),
    sourceRef: v.optional(v.string()), // SO/DO reference
    memo: v.optional(v.string()),
    subtotal: v.number(),
    discountTotal: v.number(),
    taxTotal: v.number(),
    total: v.number(),
    paid: v.number(),
    status: v.union(v.literal("posted"), v.literal("paid"), v.literal("void")),
    isPos: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_number", ["companyId", "number"]),

  salesInvoiceLines: defineTable({
    companyId: v.id("companies"),
    invoiceId: v.id("salesInvoices"),
    itemId: v.optional(v.id("items")),
    sku: v.string(),
    name: v.string(),
    unit: v.string(),
    qty: v.number(),
    price: v.number(),
    discount: v.number(),
    taxRate: v.number(),
    amount: v.number(),
    cost: v.number(),
  }).index("by_invoice", ["invoiceId"]),

  salesReturns: defineTable({
    companyId: v.id("companies"),
    number: v.string(),
    date: v.string(),
    invoiceId: v.id("salesInvoices"),
    invoiceNumber: v.string(),
    customerId: v.optional(v.id("customers")),
    customerName: v.string(),
    reason: v.optional(v.string()),
    restock: v.boolean(),
    subtotal: v.number(),
    taxTotal: v.number(),
    total: v.number(),
    cogsReversal: v.number(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_number", ["companyId", "number"])
    .index("by_invoice", ["invoiceId"]),

  salesReturnLines: defineTable({
    companyId: v.id("companies"),
    returnId: v.id("salesReturns"),
    invoiceLineId: v.id("salesInvoiceLines"),
    itemId: v.optional(v.id("items")),
    sku: v.string(),
    name: v.string(),
    unit: v.string(),
    qty: v.number(),
    price: v.number(),
    amount: v.number(),
    cost: v.number(),
  }).index("by_return", ["returnId"]),

  fixedAssets: defineTable({
    companyId: v.id("companies"),
    code: v.string(),
    name: v.string(),
    category: v.optional(v.string()),
    acquisitionDate: v.string(),
    cost: v.number(),
    salvageValue: v.number(),
    usefulLifeMonths: v.number(),
    method: v.union(v.literal("straight_line"), v.literal("declining_balance")),
    location: v.optional(v.string()),
    accumulatedDepreciation: v.number(),
    lastDepreciatedMonth: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("disposed")),
    disposalDate: v.optional(v.string()),
    disposalProceeds: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_code", ["companyId", "code"]),

  receipts: defineTable({
    companyId: v.id("companies"),
    number: v.string(),
    date: v.string(),
    customerId: v.optional(v.id("customers")),
    invoiceId: v.optional(v.id("salesInvoices")),
    amount: v.number(),
    method: v.string(),
    accountId: v.optional(v.id("accounts")),
    memo: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_company", ["companyId"])
    .index("by_company_number", ["companyId", "number"])
    .index("by_invoice", ["invoiceId"]),

  purchaseBills: defineTable({
    companyId: v.id("companies"),
    number: v.string(),
    date: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    supplierName: v.string(),
    sourceRef: v.optional(v.string()), // PO reference
    memo: v.optional(v.string()),
    subtotal: v.number(),
    taxTotal: v.number(),
    total: v.number(),
    paid: v.number(),
    status: v.union(v.literal("posted"), v.literal("paid"), v.literal("void")),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_number", ["companyId", "number"]),

  purchaseBillLines: defineTable({
    companyId: v.id("companies"),
    billId: v.id("purchaseBills"),
    itemId: v.optional(v.id("items")),
    sku: v.string(),
    name: v.string(),
    unit: v.string(),
    qty: v.number(),
    price: v.number(),
    amount: v.number(),
    trackStock: v.boolean(),
  }).index("by_bill", ["billId"]),

  payments: defineTable({
    companyId: v.id("companies"),
    number: v.string(),
    date: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    billId: v.optional(v.id("purchaseBills")),
    amount: v.number(),
    method: v.string(),
    accountId: v.optional(v.id("accounts")),
    memo: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_company", ["companyId"])
    .index("by_company_number", ["companyId", "number"])
    .index("by_bill", ["billId"]),

  cashTransactions: defineTable({
    companyId: v.id("companies"),
    number: v.string(),
    date: v.string(),
    direction: v.union(v.literal("in"), v.literal("out"), v.literal("transfer")),
    amount: v.number(),
    accountId: v.id("accounts"), // cash/bank account
    contraAccountId: v.id("accounts"),
    memo: v.string(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_company", ["companyId"])
    .index("by_company_number", ["companyId", "number"]),

  journalEntries: defineTable({
    companyId: v.id("companies"),
    number: v.string(),
    date: v.string(),
    memo: v.string(),
    sourceType: v.string(), // MANUAL | SALES_INVOICE | RECEIPT | PURCHASE_BILL | PAYMENT | CASH | POS | VOID_*
    sourceNumber: v.optional(v.string()),
    totalDebit: v.number(),
    totalCredit: v.number(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_date", ["companyId", "date"])
    .index("by_company_number", ["companyId", "number"])
    .index("by_company_source", ["companyId", "sourceNumber"]),

  journalLines: defineTable({
    companyId: v.id("companies"),
    entryId: v.id("journalEntries"),
    date: v.string(),
    accountId: v.id("accounts"),
    accountCode: v.string(),
    accountName: v.string(),
    debit: v.number(),
    credit: v.number(),
    memo: v.optional(v.string()),
  })
    .index("by_entry", ["entryId"])
    .index("by_company_account", ["companyId", "accountId"]),

  stockMovements: defineTable({
    companyId: v.id("companies"),
    itemId: v.id("items"),
    warehouseId: v.id("warehouses"),
    date: v.string(),
    qty: v.number(), // signed: + in, - out
    unitCost: v.number(),
    totalCost: v.number(),
    refType: v.string(), // SALE | SALE_VOID | PURCHASE | PURCHASE_VOID | OPNAME | OPENING
    refNumber: v.optional(v.string()),
    note: v.optional(v.string()),
  })
    .index("by_company_item", ["companyId", "itemId"])
    .index("by_company_ref", ["companyId", "refType", "refNumber"]),

  stockBalances: defineTable({
    companyId: v.id("companies"),
    itemId: v.id("items"),
    warehouseId: v.id("warehouses"),
    qty: v.number(),
  }).index("by_company_item", ["companyId", "itemId"]),

  counters: defineTable({
    companyId: v.id("companies"),
    key: v.string(),
    value: v.number(),
  }).index("by_company_key", ["companyId", "key"]),

  auditLogs: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    userName: v.optional(v.string()),
    action: v.string(),
    entity: v.string(),
    entityNumber: v.optional(v.string()),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),
});
