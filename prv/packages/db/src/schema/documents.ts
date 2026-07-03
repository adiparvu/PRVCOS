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
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { projects } from "./projects"
import { clients } from "./clients"

export const documentTypeEnum = pgEnum("document_type", [
  "contract",
  "report",
  "photo",
  "certificate",
  "invoice_doc",
  "permit",
  "specification",
  "other",
])

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "published",
  "under_review",
  "signed",
  "archived",
])

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),

    type: documentTypeEnum("type").notNull().default("other"),
    status: documentStatusEnum("status").notNull().default("draft"),

    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 500 }).notNull(),
    fileSizeBytes: varchar("file_size_bytes", { length: 20 }),
    mimeType: varchar("mime_type", { length: 100 }),

    isPublic: boolean("is_public").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    // Legal hold blocks retention archival / GDPR erasure while litigation or an
    // investigation is active (Phase 12.5).
    legalHold: boolean("legal_hold").notNull().default(false),
    legalHoldReason: text("legal_hold_reason"),

    tags: jsonb("tags").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("documents_company_id_idx").on(table.companyId),
    index("documents_project_id_idx").on(table.projectId),
    index("documents_client_id_idx").on(table.clientId),
    index("documents_type_idx").on(table.type),
  ]
)

export const documentSignatures = pgTable(
  "document_signatures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    signerName: varchar("signer_name", { length: 255 }).notNull(),
    signerEmail: varchar("signer_email", { length: 254 }).notNull(),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    signatureUrl: text("signature_url"),
    ipAddress: varchar("ip_address", { length: 45 }),
  },
  (table) => [index("document_signatures_document_id_idx").on(table.documentId)]
)

export const documentsRelations = relations(documents, ({ one, many }) => ({
  company: one(companies, { fields: [documents.companyId], references: [companies.id] }),
  uploadedBy: one(users, { fields: [documents.uploadedByUserId], references: [users.id] }),
  project: one(projects, { fields: [documents.projectId], references: [projects.id] }),
  client: one(clients, { fields: [documents.clientId], references: [clients.id] }),
  signatures: many(documentSignatures),
}))

export const documentSignaturesRelations = relations(documentSignatures, ({ one }) => ({
  document: one(documents, {
    fields: [documentSignatures.documentId],
    references: [documents.id],
  }),
  user: one(users, { fields: [documentSignatures.userId], references: [users.id] }),
}))

// Retention policies (Phase 12.5) — per document type, how long a document is
// kept and whether it is auto-archived once it passes its effective expiry.
export const retentionPolicies = pgTable(
  "retention_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    documentType: documentTypeEnum("document_type").notNull(),
    retentionMonths: integer("retention_months").notNull().default(60),
    autoArchive: boolean("auto_archive").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("retention_policies_company_type_unique").on(table.companyId, table.documentType),
    index("retention_policies_company_id_idx").on(table.companyId),
  ]
)

export const retentionPoliciesRelations = relations(retentionPolicies, ({ one }) => ({
  company: one(companies, { fields: [retentionPolicies.companyId], references: [companies.id] }),
}))

export type RetentionPolicy = typeof retentionPolicies.$inferSelect
