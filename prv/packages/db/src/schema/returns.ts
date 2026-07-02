import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { orders, products } from "./finance"

// Order returns & refunds (roadmap 9.3). A return moves through a
// requested → approved → received → refunded workflow (or rejected), with a set
// of returned line items driving the refund amount. Company-scoped.
export const returnReasonEnum = pgEnum("return_reason", [
  "damaged",
  "wrong_item",
  "defective",
  "not_needed",
  "other",
])
export const returnStatusEnum = pgEnum("return_status", [
  "requested",
  "approved",
  "received",
  "refunded",
  "rejected",
])

export const orderReturns = pgTable(
  "order_returns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    returnNumber: varchar("return_number", { length: 30 }).notNull(),
    reason: returnReasonEnum("reason").notNull().default("other"),
    status: returnStatusEnum("status").notNull().default("requested"),
    refundAmount: numeric("refund_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    restock: boolean("restock").notNull().default(true),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_returns_company_id_idx").on(table.companyId),
    index("order_returns_order_id_idx").on(table.orderId),
    index("order_returns_status_idx").on(table.status),
  ]
)

export const orderReturnItems = pgTable(
  "order_return_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    returnId: uuid("return_id")
      .notNull()
      .references(() => orderReturns.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
  },
  (table) => [index("order_return_items_return_id_idx").on(table.returnId)]
)

export const orderReturnsRelations = relations(orderReturns, ({ one, many }) => ({
  company: one(companies, { fields: [orderReturns.companyId], references: [companies.id] }),
  order: one(orders, { fields: [orderReturns.orderId], references: [orders.id] }),
  items: many(orderReturnItems),
}))

export const orderReturnItemsRelations = relations(orderReturnItems, ({ one }) => ({
  return: one(orderReturns, { fields: [orderReturnItems.returnId], references: [orderReturns.id] }),
}))

export type ReturnReason = (typeof returnReasonEnum.enumValues)[number]
export type ReturnStatus = (typeof returnStatusEnum.enumValues)[number]
