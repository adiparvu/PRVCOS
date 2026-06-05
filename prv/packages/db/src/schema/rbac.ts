import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleTypeEnum = pgEnum("role_type", [
  "system", // built-in, cannot be modified
  "custom", // company-created, fully configurable
])

export const grantStatusEnum = pgEnum("grant_status", ["active", "expired", "revoked"])

// ─── roles ─────────────────────────────────────────────────────────────────
// System roles are seeded once; custom roles are per-company

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    // null companyId = system role (shared across all companies)

    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    type: roleTypeEnum("type").notNull().default("custom"),

    // Inherited scope level (numeric 1–9, mirrors ScopeLevel enum)
    defaultScopeLevel: varchar("default_scope_level", { length: 30 })
      .notNull()
      .default("SCOPE_RECORD"),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("roles_company_id_idx").on(table.companyId),
    unique("roles_company_slug_unique").on(table.companyId, table.slug),
  ]
)

// ─── permissions ──────────────────────────────────────────────────────────────
// Permission keys from PERMISSION_CATALOG materialized in DB for runtime grants

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 200 }).notNull().unique(),
    module: varchar("module", { length: 100 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    description: text("description"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("permissions_module_idx").on(table.module),
    index("permissions_key_idx").on(table.key),
  ]
)

// ─── role_permissions ──────────────────────────────────────────────────────────

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("role_permissions_role_perm_unique").on(table.roleId, table.permissionId),
    index("role_permissions_role_id_idx").on(table.roleId),
    index("role_permissions_perm_id_idx").on(table.permissionId),
  ]
)

// ─── user_role_assignments ─────────────────────────────────────────────────────

export const userRoleAssignments = pgTable(
  "user_role_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),

    // Who assigned and why
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    reason: text("reason"),

    isActive: boolean("is_active").notNull().default(true),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("user_role_assignments_user_company_role_unique").on(
      table.userId,
      table.companyId,
      table.roleId
    ),
    index("user_role_assignments_user_company_idx").on(table.userId, table.companyId),
    index("user_role_assignments_role_id_idx").on(table.roleId),
  ]
)

// ─── temporary_access_grants ──────────────────────────────────────────────────

export const temporaryAccessGrants = pgTable(
  "temporary_access_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Elevates user to this role for duration
    grantedRoleId: uuid("granted_role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),

    // OR grants individual permissions (for fine-grained elevation)
    grantedPermissions: jsonb("granted_permissions").notNull().default([]),

    reason: text("reason").notNull(),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),

    status: grantStatusEnum("status").notNull().default("active"),

    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),

    // Inngest job id to cancel if revoked early
    inngestJobId: varchar("inngest_job_id", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("temp_grants_user_company_idx").on(table.userId, table.companyId),
    index("temp_grants_status_expires_idx").on(table.status, table.expiresAt),
    index("temp_grants_user_id_idx").on(table.userId),
  ]
)

// ─── auth rate limiting / account lockout ─────────────────────────────────────

export const authLockouts = pgTable(
  "auth_lockouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: varchar("identifier", { length: 254 }).notNull(), // email or userId
    failedAttempts: varchar("failed_attempts", { length: 10 }).notNull().default("0"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),
    unlockToken: varchar("unlock_token", { length: 128 }),
    unlockTokenExpiresAt: timestamp("unlock_token_expires_at", { withTimezone: true }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    unlockedBy: uuid("unlocked_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_lockouts_identifier_idx").on(table.identifier)]
)

// ─── TOTP backup codes ──────────────────────────────────────────────────────

export const mfaBackupCodes = pgTable(
  "mfa_backup_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(), // SHA-256 hex
    usedAt: timestamp("used_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mfa_backup_codes_user_id_idx").on(table.userId),
    index("mfa_backup_codes_hash_idx").on(table.codeHash),
  ]
)

// ─── password_reset_tokens ────────────────────────────────────────────────────

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(), // SHA-256 of raw token
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ipAddress: varchar("ip_address", { length: 45 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_user_id_idx").on(table.userId),
    index("password_reset_tokens_hash_idx").on(table.tokenHash),
  ]
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const rolesRelations = relations(roles, ({ one, many }) => ({
  company: one(companies, { fields: [roles.companyId], references: [companies.id] }),
  rolePermissions: many(rolePermissions),
  userAssignments: many(userRoleAssignments),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}))

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}))

export const userRoleAssignmentsRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(users, { fields: [userRoleAssignments.userId], references: [users.id] }),
  company: one(companies, {
    fields: [userRoleAssignments.companyId],
    references: [companies.id],
  }),
  role: one(roles, { fields: [userRoleAssignments.roleId], references: [roles.id] }),
  assignedByUser: one(users, {
    fields: [userRoleAssignments.assignedBy],
    references: [users.id],
    relationName: "assignment_assigner",
  }),
}))

export const temporaryAccessGrantsRelations = relations(temporaryAccessGrants, ({ one }) => ({
  user: one(users, { fields: [temporaryAccessGrants.userId], references: [users.id] }),
  company: one(companies, {
    fields: [temporaryAccessGrants.companyId],
    references: [companies.id],
  }),
  grantedRole: one(roles, {
    fields: [temporaryAccessGrants.grantedRoleId],
    references: [roles.id],
  }),
  grantedByUser: one(users, {
    fields: [temporaryAccessGrants.grantedBy],
    references: [users.id],
    relationName: "grant_granter",
  }),
}))

export const mfaBackupCodesRelations = relations(mfaBackupCodes, ({ one }) => ({
  user: one(users, { fields: [mfaBackupCodes.userId], references: [users.id] }),
}))

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}))
