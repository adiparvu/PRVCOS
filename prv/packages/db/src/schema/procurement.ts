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
  purchaseRequests: many(purchaseRequests),
  goodsReceiptNotes: many(goodsReceiptNotes),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}))

// ── Purchase Requests ─────────────────────────────────────────────────────────

export const purchaseRequestStatusEnum = pgEnum("purchase_request_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "converted",
])

export const purchaseRequests = pgTable(
  "purchase_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    purchaseOrderId: uuid("purchase_order_id").references(() => purchaseOrders.id, {
      onDelete: "set null",
    }),

    itemDescription: varchar("item_description", { length: 500 }).notNull(),
    category: varchar("category", { length: 100 }).notNull().default("materials"),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull().default("1"),
    unit: varchar("unit", { length: 50 }).notNull().default("buc"),
    estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),
    urgency: varchar("urgency", { length: 20 }).notNull().default("standard"),
    department: varchar("department", { length: 255 }),
    justification: text("justification"),

    status: purchaseRequestStatusEnum("status").notNull().default("draft"),
    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("purchase_requests_company_id_idx").on(table.companyId),
    index("purchase_requests_requested_by_idx").on(table.requestedByUserId),
    index("purchase_requests_status_idx").on(table.status),
  ]
)

export const purchaseRequestsRelations = relations(purchaseRequests, ({ one }) => ({
  company: one(companies, { fields: [purchaseRequests.companyId], references: [companies.id] }),
  requestedBy: one(users, {
    fields: [purchaseRequests.requestedByUserId],
    references: [users.id],
    relationName: "requestedByUser",
  }),
  approvedBy: one(users, {
    fields: [purchaseRequests.approvedByUserId],
    references: [users.id],
    relationName: "approvedByUser",
  }),
  project: one(projects, { fields: [purchaseRequests.projectId], references: [projects.id] }),
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseRequests.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}))

// ── Goods Receipt Notes ───────────────────────────────────────────────────────

export const grnStatusEnum = pgEnum("grn_status", ["draft", "confirmed", "partial"])

export const grnItemConditionEnum = pgEnum("grn_item_condition", ["good", "damaged", "rejected"])

export const goodsReceiptNotes = pgTable(
  "goods_receipt_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    receivedByUserId: uuid("received_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    grnRef: varchar("grn_ref", { length: 50 }).notNull(),
    receivedDate: varchar("received_date", { length: 10 }).notNull(),
    status: grnStatusEnum("status").notNull().default("draft"),
    notes: text("notes"),
    matchStatus: varchar("match_status", { length: 20 }).notNull().default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("grn_company_id_idx").on(table.companyId),
    index("grn_purchase_order_id_idx").on(table.purchaseOrderId),
  ]
)

export const goodsReceiptNotesRelations = relations(goodsReceiptNotes, ({ one, many }) => ({
  company: one(companies, { fields: [goodsReceiptNotes.companyId], references: [companies.id] }),
  purchaseOrder: one(purchaseOrders, {
    fields: [goodsReceiptNotes.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  receivedBy: one(users, {
    fields: [goodsReceiptNotes.receivedByUserId],
    references: [users.id],
  }),
  items: many(grnItems),
}))

export const grnItems = pgTable(
  "grn_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    grnId: uuid("grn_id")
      .notNull()
      .references(() => goodsReceiptNotes.id, { onDelete: "cascade" }),
    purchaseOrderItemId: uuid("purchase_order_item_id").references(() => purchaseOrderItems.id, {
      onDelete: "set null",
    }),

    description: text("description").notNull(),
    orderedQty: numeric("ordered_qty", { precision: 10, scale: 3 }).notNull(),
    receivedQty: numeric("received_qty", { precision: 10, scale: 3 }).notNull().default("0"),
    unit: varchar("unit", { length: 50 }).notNull().default("buc"),
    condition: grnItemConditionEnum("condition").notNull().default("good"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("grn_items_grn_id_idx").on(table.grnId)]
)

export const grnItemsRelations = relations(grnItems, ({ one }) => ({
  grn: one(goodsReceiptNotes, { fields: [grnItems.grnId], references: [goodsReceiptNotes.id] }),
  purchaseOrderItem: one(purchaseOrderItems, {
    fields: [grnItems.purchaseOrderItemId],
    references: [purchaseOrderItems.id],
  }),
}))
