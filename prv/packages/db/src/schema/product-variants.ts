import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { products } from "./finance"

// Product variants (roadmap 9.1). A sellable variation of a product along option
// axes (size / colour / material / …), each with its own SKU, optional price
// override, and stock. Company-scoped.
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    // Option axes for this variant, e.g. { "Colour": "Red", "Size": "L" }.
    options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
    // Overrides the parent product price when set.
    price: numeric("price", { precision: 12, scale: 2 }),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_variants_company_id_idx").on(table.companyId),
    index("product_variants_product_id_idx").on(table.productId),
  ]
)

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  company: one(companies, { fields: [productVariants.companyId], references: [companies.id] }),
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}))
