import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { suppliers } from "./suppliers"
import { purchaseOrders, goodsReceiptNotes } from "./procurement"
import { users } from "./users"

// Accounts Payable — supplier invoices (roadmap 11.6). A bill received from a
// supplier, optionally matched to a purchase order, moving through
// received → scheduled → paid (or cancelled), with partial payments tracked via
// paidAmount. Overdue status is derived from dueDate at read time.
export const payableStatusEnum = pgEnum("payable_status", [
  "received",
  "scheduled",
  "paid",
  "cancelled",
])

export const supplierInvoices = pgTable(
  "supplier_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, {
      onDelete: "set null",
    }),
    // 3-way match leg (roadmap 21.4): the receipt this invoice was reconciled
    // against, the resulting status, and the signed price variance vs the value
    // of goods actually received.
    grnId: uuid("grn_id").references(() => goodsReceiptNotes.id, {
      onDelete: "set null",
    }),
    matchStatus: varchar("match_status", { length: 20 }).notNull().default("unmatched"),
    matchVariance: numeric("match_variance", { precision: 12, scale: 2 }),

    invoiceNumber: varchar("invoice_number", { length: 60 }).notNull(),
    status: payableStatusEnum("status").notNull().default("received"),

    issueDate: date("issue_date"),
    dueDate: date("due_date").notNull(),
    scheduledDate: date("scheduled_date"),
    paidDate: date("paid_date"),

    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("supplier_invoices_company_id_idx").on(table.companyId),
    index("supplier_invoices_supplier_id_idx").on(table.supplierId),
    index("supplier_invoices_status_idx").on(table.status),
    index("supplier_invoices_due_date_idx").on(table.dueDate),
  ]
)

export const supplierInvoicesRelations = relations(supplierInvoices, ({ one }) => ({
  company: one(companies, { fields: [supplierInvoices.companyId], references: [companies.id] }),
  supplier: one(suppliers, { fields: [supplierInvoices.supplierId], references: [suppliers.id] }),
  purchaseOrder: one(purchaseOrders, {
    fields: [supplierInvoices.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  createdBy: one(users, { fields: [supplierInvoices.createdById], references: [users.id] }),
}))

export type PayableStatus = (typeof payableStatusEnum.enumValues)[number]
export type SupplierInvoice = typeof supplierInvoices.$inferSelect
export type NewSupplierInvoice = typeof supplierInvoices.$inferInsert
