import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { clients, clientContacts } from "./clients"
import { suppliers } from "./suppliers"

// Portal Auth Pattern (RA-01): one mechanism shared by all external portals.
// Portal identities are fully separated from internal users — an external
// contact never gets an internal account or any internal permission.

export const portalTypeEnum = pgEnum("portal_type", [
  "client",
  "supplier",
  "subcontractor",
  "employee",
])

export const portalAccounts = pgTable(
  "portal_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    portalType: portalTypeEnum("portal_type").notNull().default("client"),

    // Entity binding — exactly one of these is set, matching portalType
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => clientContacts.id, { onDelete: "set null" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),

    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),

    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("portal_accounts_company_email_type_uq").on(
      table.companyId,
      table.email,
      table.portalType
    ),
    index("portal_accounts_company_id_idx").on(table.companyId),
    index("portal_accounts_client_id_idx").on(table.clientId),
    index("portal_accounts_email_idx").on(table.email),
  ]
)

// One-time magic-link tokens. Only the SHA-256 hash is stored.
export const portalMagicTokens = pgTable(
  "portal_magic_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => portalAccounts.id, { onDelete: "cascade" }),

    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("portal_magic_tokens_hash_uq").on(table.tokenHash),
    index("portal_magic_tokens_account_id_idx").on(table.accountId),
  ]
)

// Long-lived portal sessions, separate cookie namespace from internal auth.
export const portalSessions = pgTable(
  "portal_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => portalAccounts.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("portal_sessions_hash_uq").on(table.tokenHash),
    index("portal_sessions_account_id_idx").on(table.accountId),
    index("portal_sessions_company_id_idx").on(table.companyId),
  ]
)

export const portalAccountsRelations = relations(portalAccounts, ({ one, many }) => ({
  company: one(companies, { fields: [portalAccounts.companyId], references: [companies.id] }),
  client: one(clients, { fields: [portalAccounts.clientId], references: [clients.id] }),
  contact: one(clientContacts, {
    fields: [portalAccounts.contactId],
    references: [clientContacts.id],
  }),
  supplier: one(suppliers, { fields: [portalAccounts.supplierId], references: [suppliers.id] }),
  sessions: many(portalSessions),
  magicTokens: many(portalMagicTokens),
}))

export const portalSessionsRelations = relations(portalSessions, ({ one }) => ({
  account: one(portalAccounts, {
    fields: [portalSessions.accountId],
    references: [portalAccounts.id],
  }),
}))

export const portalMagicTokensRelations = relations(portalMagicTokens, ({ one }) => ({
  account: one(portalAccounts, {
    fields: [portalMagicTokens.accountId],
    references: [portalAccounts.id],
  }),
}))
