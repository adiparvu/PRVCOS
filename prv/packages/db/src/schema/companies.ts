import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

export const companyTypeEnum = pgEnum("company_type", [
  "renovations",
  "projects",
  "shop",
  "services",
  "other",
])

export const companyStatusEnum = pgEnum("company_status", [
  "active",
  "suspended",
  "onboarding",
  "churned",
])

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id"), // nullable — null means root group company

  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  type: companyTypeEnum("type").notNull().default("other"),
  status: companyStatusEnum("status").notNull().default("onboarding"),

  // Branding
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  primaryColor: varchar("primary_color", { length: 7 }),

  // Contact
  email: varchar("email", { length: 254 }),
  phone: varchar("phone", { length: 32 }),
  website: text("website"),

  // Address
  country: varchar("country", { length: 2 }).notNull().default("RO"),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  postalCode: varchar("postal_code", { length: 20 }),

  // Legal
  vatNumber: varchar("vat_number", { length: 50 }),
  registrationNumber: varchar("registration_number", { length: 50 }),

  // Config (locale, timezone, currency, feature flags)
  settings: jsonb("settings").notNull().default({}),

  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
})

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  region: varchar("region", { length: 100 }),

  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 254 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),

  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings").notNull().default({}),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  parentId: uuid("parent_id"), // self-referential for sub-departments

  headUserId: uuid("head_user_id"), // FK added after users table
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),

  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),

  leadUserId: uuid("lead_user_id"), // FK added after users table
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  stores: many(stores),
  departments: many(departments),
  teams: many(teams),
}))

export const storesRelations = relations(stores, ({ one }) => ({
  company: one(companies, { fields: [stores.companyId], references: [companies.id] }),
}))

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  company: one(companies, { fields: [departments.companyId], references: [companies.id] }),
  teams: many(teams),
}))

export const teamsRelations = relations(teams, ({ one }) => ({
  company: one(companies, { fields: [teams.companyId], references: [companies.id] }),
  department: one(departments, { fields: [teams.departmentId], references: [departments.id] }),
  store: one(stores, { fields: [teams.storeId], references: [stores.id] }),
}))
