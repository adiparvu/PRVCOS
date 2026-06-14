import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { suppliers } from "./suppliers"
import { projects } from "./projects"

export const poStatusEnum = pgEnum("po_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "in_transit",
  "received",
])

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),

    ref: varchar("ref", { length: 50 }).notNull(),
    description: varchar("description", { length: 500 }).notNull(),
    supplierName: varchar("supplier_name", { length: 255 }),

    date: varchar("date", { length: 10 }).notNull(),
    neededBy: varchar("needed_by", { length: 10 }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),

    status: poStatusEnum("status").notNull().default("draft"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("purchase_orders_company_id_idx").on(table.companyId),
    index("purchase_orders_supplier_id_idx").on(table.supplierId),
    index("purchase_orders_status_idx").on(table.status),
  ]
)

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),

    description: text("description").notNull(),
    ref: varchar("ref", { length: 100 }),
    unit: varchar("unit", { length: 50 }).notNull().default("buc"),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("purchase_order_items_po_id_idx").on(table.purchaseOrderId)]
)

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  company: one(companies, { fields: [purchaseOrders.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [purchaseOrders.createdByUserId], references: [users.id] }),
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  project: one(projects, { fields: [purchaseOrders.projectId], references: [projects.id] }),
  items: many(purchaseOrderItems),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}))
