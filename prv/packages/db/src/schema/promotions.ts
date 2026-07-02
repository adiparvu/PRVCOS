import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// Promotions & coupons (roadmap 9.5). A promotion is a discount rule that either
// auto-applies or is redeemed by a coupon code, with a validity window, minimum
// spend, and usage caps. Company-scoped.
export const promotionTypeEnum = pgEnum("promotion_type", [
  "percentage",
  "fixed_amount",
  "free_shipping",
])
export const promotionScopeEnum = pgEnum("promotion_scope", ["order", "product", "category"])
export const promotionStatusEnum = pgEnum("promotion_status", [
  "draft",
  "active",
  "paused",
  "expired",
])

export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    type: promotionTypeEnum("type").notNull().default("percentage"),
    scope: promotionScopeEnum("scope").notNull().default("order"),
    // Percentage (0–100) or a fixed amount, depending on type.
    value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
    minSubtotal: numeric("min_subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    // Coupon code — null means auto-apply.
    code: varchar("code", { length: 40 }),
    status: promotionStatusEnum("status").notNull().default("draft"),
    startsAt: date("starts_at"),
    endsAt: date("ends_at"),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    perCustomerLimit: integer("per_customer_limit"),
    stackable: boolean("stackable").notNull().default(false),
    autoApply: boolean("auto_apply").notNull().default(false),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("promotions_company_id_idx").on(table.companyId),
    index("promotions_code_idx").on(table.companyId, table.code),
    index("promotions_status_idx").on(table.status),
  ]
)

export const promotionsRelations = relations(promotions, ({ one }) => ({
  company: one(companies, { fields: [promotions.companyId], references: [companies.id] }),
}))

export type PromotionType = (typeof promotionTypeEnum.enumValues)[number]
export type PromotionStatus = (typeof promotionStatusEnum.enumValues)[number]
