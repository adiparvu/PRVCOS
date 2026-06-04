import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"

export const supplierStatusEnum = pgEnum("supplier_status", [
  "active",
  "inactive",
  "pending",
  "blacklisted",
])

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    status: supplierStatusEnum("status").notNull().default("active"),

    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    vatNumber: varchar("vat_number", { length: 50 }),
    registrationNumber: varchar("registration_number", { length: 50 }),

    contactName: varchar("contact_name", { length: 255 }),
    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 32 }),
    website: text("website"),

    country: varchar("country", { length: 2 }).notNull().default("RO"),
    city: varchar("city", { length: 100 }),
    address: text("address"),
    postalCode: varchar("postal_code", { length: 20 }),

    paymentTermsDays: integer("payment_terms_days").notNull().default(30),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    notes: text("notes"),
    tags: jsonb("tags").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [index("suppliers_company_id_idx").on(table.companyId)]
)

export const suppliersRelations = relations(suppliers, ({ one }) => ({
  company: one(companies, { fields: [suppliers.companyId], references: [companies.id] }),
}))
