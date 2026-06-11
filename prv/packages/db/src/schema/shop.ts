import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { products } from "./finance"

// ─── Product Reviews ─────────────────────────────────────────────────────────

export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    rating: smallint("rating").notNull(), // 1–5
    title: varchar("title", { length: 255 }),
    body: text("body"),
    authorName: varchar("author_name", { length: 100 }),

    isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
    isApproved: boolean("is_approved").notNull().default(true),
    helpfulCount: integer("helpful_count").notNull().default(0),

    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("product_reviews_product_id_idx").on(table.productId),
    index("product_reviews_company_id_idx").on(table.companyId),
    index("product_reviews_user_id_idx").on(table.userId),
    index("product_reviews_approved_idx").on(table.isApproved),
  ]
)

// ─── Product Wishlist ─────────────────────────────────────────────────────────

export const productWishlistItems = pgTable(
  "product_wishlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    notes: text("notes"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("wishlist_user_product_unique").on(table.userId, table.productId),
    index("wishlist_user_id_idx").on(table.userId),
    index("wishlist_company_id_idx").on(table.companyId),
  ]
)

// ─── Product Comparisons ──────────────────────────────────────────────────────

export const productComparisons = pgTable(
  "product_comparisons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("comparison_user_product_unique").on(table.userId, table.productId),
    index("comparison_user_id_idx").on(table.userId),
  ]
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  company: one(companies, { fields: [productReviews.companyId], references: [companies.id] }),
  product: one(products, { fields: [productReviews.productId], references: [products.id] }),
  user: one(users, { fields: [productReviews.userId], references: [users.id] }),
}))

export const productWishlistItemsRelations = relations(productWishlistItems, ({ one }) => ({
  company: one(companies, {
    fields: [productWishlistItems.companyId],
    references: [companies.id],
  }),
  user: one(users, { fields: [productWishlistItems.userId], references: [users.id] }),
  product: one(products, { fields: [productWishlistItems.productId], references: [products.id] }),
}))

export const productComparisonsRelations = relations(productComparisons, ({ one }) => ({
  user: one(users, { fields: [productComparisons.userId], references: [users.id] }),
  product: one(products, { fields: [productComparisons.productId], references: [products.id] }),
}))
