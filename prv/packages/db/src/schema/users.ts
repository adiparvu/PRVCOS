import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies, departments, teams, stores } from "./companies"

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "suspended",
  "onboarding",
  "offboarded",
])

export const systemRoleEnum = pgEnum("system_role", [
  // Core
  "group_ceo",
  "ceo",
  "co_ceo",
  "system_administrator",
  // Attendance
  "worker",
  "team_leader",
  "oms",
  "operations_manager",
  "department_head",
  "hr_payroll",
  // Projects
  "project_worker",
  "project_team_leader",
  "project_oms",
  "project_operations_manager",
  "project_director",
  // Shop
  "seller",
  "store_manager",
  "shop_director",
  // Analytics
  "app_support_specialist",
  "data_analyst",
  "qa_tester",
])

export const scopeLevelEnum = pgEnum("scope_level", [
  "SCOPE_RECORD",
  "SCOPE_TEAM",
  "SCOPE_DEPARTMENT",
  "SCOPE_STORE",
  "SCOPE_REGION",
  "SCOPE_COMPANY",
  "SCOPE_GROUP",
  "SCOPE_PLATFORM",
  "SCOPE_GLOBAL",
])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Identity (linked to Supabase Auth)
    supabaseId: uuid("supabase_id").unique(), // auth.users.id
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 32 }),

    // Profile
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),

    // Employment
    employeeId: varchar("employee_id", { length: 100 }),
    jobTitle: varchar("job_title", { length: 255 }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    managerId: uuid("manager_id"), // self-referential, set after table creation

    // Role & access
    role: systemRoleEnum("role").notNull(),
    scopeLevel: scopeLevelEnum("scope_level").notNull(),
    status: userStatusEnum("status").notNull().default("onboarding"),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),

    // Security settings
    securityLevel: varchar("security_level", { length: 20 }).notNull().default("standard"),
    maxSessionTtlSeconds: varchar("max_session_ttl_seconds", { length: 20 }),

    // Locale preferences
    locale: varchar("locale", { length: 10 }).notNull().default("ro-RO"),
    timezone: varchar("timezone", { length: 50 }).notNull().default("Europe/Bucharest"),

    // Misc
    settings: jsonb("settings").notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("users_company_id_idx").on(table.companyId),
    index("users_email_idx").on(table.email),
    index("users_supabase_id_idx").on(table.supabaseId),
    unique("users_company_email_unique").on(table.companyId, table.email),
  ]
)

// MFA methods registered by a user
export const userMfaMethods = pgTable(
  "user_mfa_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    method: varchar("method", { length: 20 }).notNull(), // totp | sms | email_otp | passkey
    identifier: varchar("identifier", { length: 255 }), // phone / email / credential id
    secretEncrypted: text("secret_encrypted"), // TOTP secret (AES-256-GCM)
    isPrimary: boolean("is_primary").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("user_mfa_methods_user_id_idx").on(table.userId)]
)

// Trusted devices
export const userDevices = pgTable(
  "user_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    deviceId: uuid("device_id").notNull().unique(),
    name: varchar("name", { length: 255 }),
    userAgent: text("user_agent"),
    platform: varchar("platform", { length: 50 }), // web | ios | android
    isTrusted: boolean("is_trusted").notNull().default(false),
    trustExpiresAt: timestamp("trust_expires_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("user_devices_user_id_idx").on(table.userId)]
)

// Audit log for sensitive user actions
export const userAuditLog = pgTable(
  "user_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    targetUserId: uuid("target_user_id").references(() => users.id),

    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    diff: jsonb("diff"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_audit_log_company_id_idx").on(table.companyId),
    index("user_audit_log_actor_id_idx").on(table.actorId),
    index("user_audit_log_created_at_idx").on(table.createdAt),
  ]
)

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  department: one(departments, { fields: [users.departmentId], references: [departments.id] }),
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  store: one(stores, { fields: [users.storeId], references: [stores.id] }),
  mfaMethods: many(userMfaMethods),
  devices: many(userDevices),
  auditLogs: many(userAuditLog),
}))

export const userMfaMethodsRelations = relations(userMfaMethods, ({ one }) => ({
  user: one(users, { fields: [userMfaMethods.userId], references: [users.id] }),
}))

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, { fields: [userDevices.userId], references: [users.id] }),
}))
