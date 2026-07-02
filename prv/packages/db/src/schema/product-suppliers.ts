import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { products } from "./finance"
import { suppliers } from "./suppliers"

// Product ↔ supplier sourcing links (roadmap 9.4). Which suppliers can supply a
// product, at what cost / lead time, with one flagged preferred. Company-scoped;
// one link per (product, supplier).
export const productSuppliers = pgTable(
  "product_suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    supplierSku: varchar("supplier_sku", { length: 100 }),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    leadTimeDays: integer("lead_time_days"),
    minOrderQty: integer("min_order_qty"),
    isPreferred: boolean("is_preferred").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("product_suppliers_product_supplier_unique").on(table.productId, table.supplierId),
    index("product_suppliers_company_id_idx").on(table.companyId),
    index("product_suppliers_product_id_idx").on(table.productId),
    index("product_suppliers_supplier_id_idx").on(table.supplierId),
  ]
)

export const productSuppliersRelations = relations(productSuppliers, ({ one }) => ({
  company: one(companies, { fields: [productSuppliers.companyId], references: [companies.id] }),
  product: one(products, { fields: [productSuppliers.productId], references: [products.id] }),
  supplier: one(suppliers, { fields: [productSuppliers.supplierId], references: [suppliers.id] }),
}))
