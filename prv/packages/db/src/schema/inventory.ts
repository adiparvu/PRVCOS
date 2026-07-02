import { pgTable, uuid, integer, text, timestamp, pgEnum, index, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies, stores } from "./companies"
import { users } from "./users"
import { products } from "./finance"

// Multi-location inventory (roadmap 9.2). Stock levels per (product, store) and
// an append-only movement log. The per-location model supersedes the scalar
// products.stockQuantity for real inventory management. Company-scoped.
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "receive",
  "sale",
  "adjust",
  "writeoff",
  "return",
  "count",
])

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    minimum: integer("minimum").notNull().default(0),
    reorderPoint: integer("reorder_point"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("stock_levels_product_store_unique").on(table.productId, table.storeId),
    index("stock_levels_company_id_idx").on(table.companyId),
    index("stock_levels_store_id_idx").on(table.storeId),
  ]
)

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    type: stockMovementTypeEnum("type").notNull(),
    // Signed change applied to the level; balanceAfter snapshots the result.
    delta: integer("delta").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_movements_company_id_idx").on(table.companyId),
    index("stock_movements_product_id_idx").on(table.productId),
    index("stock_movements_store_id_idx").on(table.storeId),
    index("stock_movements_created_at_idx").on(table.createdAt),
  ]
)

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  company: one(companies, { fields: [stockLevels.companyId], references: [companies.id] }),
  product: one(products, { fields: [stockLevels.productId], references: [products.id] }),
  store: one(stores, { fields: [stockLevels.storeId], references: [stores.id] }),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  company: one(companies, { fields: [stockMovements.companyId], references: [companies.id] }),
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  store: one(stores, { fields: [stockMovements.storeId], references: [stores.id] }),
}))

export type StockMovementType = (typeof stockMovementTypeEnum.enumValues)[number]
