import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  bigserial,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { companies } from "./companies"
import { users } from "./users"

export const securityEventTypeEnum = pgEnum("security_event_type", [
  "auth_failure",
  "mfa_failure",
  "mfa_required",
  "session_expired",
  "insufficient_scope",
  "insufficient_role",
  "company_mismatch",
  "rate_limit_exceeded",
  "dlp_triggered",
  "privilege_escalation",
  "account_locked",
  "device_untrusted",
  "reauth_required",
])

export const securityEventSeverityEnum = pgEnum("security_event_severity", [
  "low",
  "medium",
  "high",
  "critical",
])

// Append-only, SHA-256 hash-chained per company
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceNumber: bigserial("sequence_number", { mode: "number" }).notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    actorId: uuid("actor_id").references(() => users.id),
    sessionId: varchar("session_id", { length: 36 }),

    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    payload: jsonb("payload"),

    method: varchar("method", { length: 10 }),
    path: varchar("path", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    // Set when action was taken during an active JIT sysadmin session
    impersonatedBy: uuid("impersonated_by").references(() => users.id),
    jitSessionId: uuid("jit_session_id"),

    // 0 = all gates passed; 1–9 = gate number that rejected the request
    gateFailed: integer("gate_failed").notNull().default(0),
    errorCode: varchar("error_code", { length: 50 }),

    prevHash: varchar("prev_hash", { length: 64 }).notNull(),
    entryHash: varchar("entry_hash", { length: 64 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_company_id_idx").on(table.companyId),
    index("audit_logs_actor_id_idx").on(table.actorId),
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_company_seq_idx").on(table.companyId, table.sequenceNumber),
  ]
)

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id),
    actorId: uuid("actor_id").references(() => users.id),

    eventType: securityEventTypeEnum("event_type").notNull(),
    severity: securityEventSeverityEnum("severity").notNull(),

    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    path: varchar("path", { length: 500 }),
    sessionId: varchar("session_id", { length: 36 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("security_events_company_id_idx").on(table.companyId),
    index("security_events_actor_id_idx").on(table.actorId),
    index("security_events_event_type_idx").on(table.eventType),
    index("security_events_severity_idx").on(table.severity),
    index("security_events_created_at_idx").on(table.createdAt),
  ]
)
