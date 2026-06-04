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
} from "drizzle-orm/pg-core"
import { users } from "./users"
import { companies } from "./companies"

// ─── JIT Sysadmin Access ──────────────────────────────────────────────────────

export const jitStatusEnum = pgEnum("jit_status", [
  "pending",
  "approved",
  "active",
  "expired",
  "revoked",
  "break_glass",
])

export const sysadminAccessSessions = pgTable(
  "sysadmin_access_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),

    status: jitStatusEnum("status").notNull().default("pending"),
    justification: text("justification").notNull(),
    isBreakGlass: boolean("is_break_glass").notNull().default(false),
    breakGlassJustification: text("break_glass_justification"),

    // 4-eyes approval — two distinct approvers, both different from requestedBy
    approverId1: uuid("approver_id_1").references(() => users.id, { onDelete: "set null" }),
    approvedAt1: timestamp("approved_at_1", { withTimezone: true }),
    approverId2: uuid("approver_id_2").references(() => users.id, { onDelete: "set null" }),
    approvedAt2: timestamp("approved_at_2", { withTimezone: true }),

    // Session token — stored as SHA-256(rawToken), never plaintext
    sessionTokenHash: varchar("session_token_hash", { length: 64 }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // startedAt + 2h
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jit_sessions_requested_by_idx").on(table.requestedBy),
    index("jit_sessions_status_idx").on(table.status),
    index("jit_sessions_expires_at_idx").on(table.expiresAt),
  ]
)

// ─── GDPR Data Erasure ────────────────────────────────────────────────────────

export const erasureStatusEnum = pgEnum("erasure_status", [
  "pending",
  "approved",
  "executing",
  "completed",
  "failed",
  "rejected",
])

export const dataErasureRequests = pgTable(
  "data_erasure_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: erasureStatusEnum("status").notNull().default("pending"),
    requestReason: text("request_reason").notNull(),
    // GDPR Art. 17 legal basis for erasure
    gdprBasis: varchar("gdpr_basis", { length: 100 }).notNull().default("right_to_erasure"),

    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedBy: uuid("rejected_by").references(() => users.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    executedAt: timestamp("executed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // SHA-256(targetUserId + completedAt + JSON.stringify(erasureLog)) — immutable proof
    verificationHash: varchar("verification_hash", { length: 64 }),
    erasureLog: jsonb("erasure_log").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("erasure_requests_company_id_idx").on(table.companyId),
    index("erasure_requests_target_user_id_idx").on(table.targetUserId),
    index("erasure_requests_status_idx").on(table.status),
  ]
)

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    // SHA-256(rawKey) — raw key is shown once at creation, never stored
    keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
    // First 12 chars of raw key — safe to display in UI
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    // Array of PermissionKey strings this key is allowed to use
    scopes: jsonb("scopes").notNull().default([]),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("api_keys_user_id_idx").on(table.userId),
    index("api_keys_company_id_idx").on(table.companyId),
    index("api_keys_key_hash_idx").on(table.keyHash),
  ]
)
