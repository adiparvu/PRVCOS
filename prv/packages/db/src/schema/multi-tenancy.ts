import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  smallint,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// ─── company_settings ──────────────────────────────────────────────────────

export const companySettings = pgTable(
  "company_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    module: varchar("module", { length: 100 }).notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    value: jsonb("value").notNull(),
    setBy: uuid("set_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("company_settings_company_module_idx").on(table.companyId, table.module),
    unique("company_settings_company_module_key_unique").on(
      table.companyId,
      table.module,
      table.key
    ),
  ]
)

// ─── user_profiles ─────────────────────────────────────────────────────────

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    employeeNumber: varchar("employee_number", { length: 50 }),
    jobTitle: varchar("job_title", { length: 255 }),
    bio: text("bio"),

    emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),

    dateOfBirth: date("date_of_birth"),
    hireDate: date("hire_date"),

    // Sensitive fields — encrypted at application layer before storage
    nationalId: varchar("national_id", { length: 100 }),
    bankIban: varchar("bank_iban", { length: 50 }),
    address: jsonb("address"),

    skills: jsonb("skills").notNull().default([]),
    certifications: jsonb("certifications").notNull().default([]),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_profiles_company_user_idx").on(table.companyId, table.userId),
    index("user_profiles_employee_number_idx").on(table.employeeNumber),
  ]
)

// ─── company_memberships ───────────────────────────────────────────────────

export const membershipStatusEnum = pgEnum("membership_status", [
  "ACTIVE",
  "INACTIVE",
  "INVITED",
  "SUSPENDED",
])

export const companyMemberships = pgTable(
  "company_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    primaryRole: varchar("primary_role", { length: 100 }).notNull(),
    additionalRoles: jsonb("additional_roles").notNull().default([]),

    scopeLevel: smallint("scope_level").notNull().default(1),
    scopeTargetType: varchar("scope_target_type", { length: 50 }),
    scopeTargetId: uuid("scope_target_id"),

    status: membershipStatusEnum("status").notNull().default("INVITED"),

    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivationReason: text("deactivation_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("company_memberships_company_user_unique").on(table.companyId, table.userId),
    index("company_memberships_company_role_idx").on(table.companyId, table.primaryRole),
    index("company_memberships_user_id_idx").on(table.userId),
    index("company_memberships_status_idx").on(table.status),
  ]
)

// ─── Relations ─────────────────────────────────────────────────────────────

export const companySettingsRelations = relations(companySettings, ({ one }) => ({
  company: one(companies, { fields: [companySettings.companyId], references: [companies.id] }),
  setByUser: one(users, { fields: [companySettings.setBy], references: [users.id] }),
}))

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
  company: one(companies, { fields: [userProfiles.companyId], references: [companies.id] }),
}))

export const companyMembershipsRelations = relations(companyMemberships, ({ one }) => ({
  company: one(companies, { fields: [companyMemberships.companyId], references: [companies.id] }),
  user: one(users, { fields: [companyMemberships.userId], references: [users.id] }),
  invitedByUser: one(users, {
    fields: [companyMemberships.invitedBy],
    references: [users.id],
    relationName: "membership_inviter",
  }),
}))
