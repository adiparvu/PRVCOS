import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  numeric,
  integer,
  date,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { clients } from "./clients"
import { stores } from "./companies"
import { projects } from "./projects"

// ─── Product Catalog ────────────────────────────────────────────────────────

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "draft",
  "archived",
  "out_of_stock",
])

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"), // self-referential for sub-categories

    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_categories_company_id_idx").on(table.companyId),
    unique("product_categories_company_slug_unique").on(table.companyId, table.slug),
  ]
)

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),

    status: productStatusEnum("status").notNull().default("draft"),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    imageUrls: jsonb("image_urls").notNull().default([]),

    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("19"),

    stockQuantity: integer("stock_quantity").notNull().default(0),
    stockMinimum: integer("stock_minimum").notNull().default(0),
    unit: varchar("unit", { length: 50 }).notNull().default("buc"),

    tags: jsonb("tags").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("products_company_id_idx").on(table.companyId),
    index("products_category_id_idx").on(table.categoryId),
    index("products_sku_idx").on(table.sku),
  ]
)

// ─── Orders ─────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
])

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),

    orderNumber: varchar("order_number", { length: 100 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),

    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    shippingAddress: jsonb("shipping_address"),
    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_company_id_idx").on(table.companyId),
    index("orders_client_id_idx").on(table.clientId),
    index("orders_status_idx").on(table.status),
    unique("orders_company_number_unique").on(table.companyId, table.orderNumber),
  ]
)

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),

    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("19"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
)

// ─── Invoices ────────────────────────────────────────────────────────────────

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
])

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),

    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("invoices_company_id_idx").on(table.companyId),
    index("invoices_client_id_idx").on(table.clientId),
    index("invoices_status_idx").on(table.status),
    index("invoices_due_date_idx").on(table.dueDate),
    unique("invoices_company_number_unique").on(table.companyId, table.invoiceNumber),
  ]
)

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),

    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull().default("buc"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("19"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("invoice_items_invoice_id_idx").on(table.invoiceId)]
)

// ─── Expenses ────────────────────────────────────────────────────────────────

export const expenseCategoryEnum = pgEnum("expense_category", [
  "materials",
  "labor",
  "equipment",
  "transport",
  "rent",
  "utilities",
  "marketing",
  "salaries",
  "subscriptions",
  "other",
])

export const expenseStatusEnum = pgEnum("expense_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "paid",
])

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    submittedById: uuid("submitted_by_id").references(() => users.id, { onDelete: "set null" }),

    title: varchar("title", { length: 255 }).notNull(),
    category: expenseCategoryEnum("category").notNull().default("other"),
    status: expenseStatusEnum("status").notNull().default("draft"),

    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    date: date("date").notNull(),
    notes: text("notes"),
    receiptUrl: text("receipt_url"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("expenses_company_id_idx").on(table.companyId),
    index("expenses_date_idx").on(table.date),
    index("expenses_status_idx").on(table.status),
    index("expenses_category_idx").on(table.category),
  ]
)

export const expensesRelations = relations(expenses, ({ one }) => ({
  company: one(companies, { fields: [expenses.companyId], references: [companies.id] }),
  store: one(stores, { fields: [expenses.storeId], references: [stores.id] }),
  submittedBy: one(users, { fields: [expenses.submittedById], references: [users.id] }),
}))

// ─── Budgets ─────────────────────────────────────────────────────────────────

export const budgetPeriodTypeEnum = pgEnum("budget_period_type", ["monthly", "quarterly", "annual"])

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    category: expenseCategoryEnum("category").notNull(),
    periodType: budgetPeriodTypeEnum("period_type").notNull().default("monthly"),
    periodKey: varchar("period_key", { length: 10 }).notNull(),
    capAmount: numeric("cap_amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("budgets_company_id_idx").on(table.companyId),
    index("budgets_period_key_idx").on(table.periodKey),
    index("budgets_category_idx").on(table.category),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  company: one(companies, { fields: [productCategories.companyId], references: [companies.id] }),
  products: many(products),
}))

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, { fields: [products.companyId], references: [companies.id] }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  company: one(companies, { fields: [orders.companyId], references: [companies.id] }),
  client: one(clients, { fields: [orders.clientId], references: [clients.id] }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, { fields: [invoices.companyId], references: [companies.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  items: many(invoiceItems),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}))

export const budgetsRelations = relations(budgets, ({ one }) => ({
  company: one(companies, { fields: [budgets.companyId], references: [companies.id] }),
  store: one(stores, { fields: [budgets.storeId], references: [stores.id] }),
  createdBy: one(users, { fields: [budgets.createdByUserId], references: [users.id] }),
}))
