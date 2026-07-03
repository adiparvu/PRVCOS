import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { documents } from "./documents"
import { users } from "./users"

// Document sharing (Phase 12.3). A share grants access to a document either
// internally (to a specific user) or externally (via an unguessable token link),
// with a permission level, optional expiry and optional password. Access via an
// external link is recorded in the access log.
export const shareScopeEnum = pgEnum("document_share_scope", ["internal", "external"])
export const sharePermissionEnum = pgEnum("document_share_permission", [
  "view",
  "download",
  "edit",
  "manage",
])

export const documentShares = pgTable(
  "document_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),

    scope: shareScopeEnum("scope").notNull().default("internal"),
    permission: sharePermissionEnum("permission").notNull().default("view"),

    granteeUserId: uuid("grantee_user_id").references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }),
    passwordProtected: boolean("password_protected").notNull().default(false),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    accessCount: integer("access_count").notNull().default(0),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("document_shares_company_id_idx").on(table.companyId),
    index("document_shares_document_id_idx").on(table.documentId),
    index("document_shares_token_idx").on(table.token),
  ]
)

export const documentShareAccessLog = pgTable(
  "document_share_access_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => documentShares.id, { onDelete: "cascade" }),
    accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
  },
  (table) => [index("document_share_access_log_share_id_idx").on(table.shareId)]
)

export const documentSharesRelations = relations(documentShares, ({ one, many }) => ({
  company: one(companies, { fields: [documentShares.companyId], references: [companies.id] }),
  document: one(documents, { fields: [documentShares.documentId], references: [documents.id] }),
  createdBy: one(users, { fields: [documentShares.createdById], references: [users.id] }),
  grantee: one(users, { fields: [documentShares.granteeUserId], references: [users.id] }),
  accessLog: many(documentShareAccessLog),
}))

export const documentShareAccessLogRelations = relations(documentShareAccessLog, ({ one }) => ({
  share: one(documentShares, {
    fields: [documentShareAccessLog.shareId],
    references: [documentShares.id],
  }),
}))

export type DocumentShare = typeof documentShares.$inferSelect
export type SharePermission = (typeof sharePermissionEnum.enumValues)[number]
export type ShareScope = (typeof shareScopeEnum.enumValues)[number]
