import { pgTable, uuid, varchar, text, date, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// HR compliance documents (roadmap 8.5). Typed per-employee documents (ID, right
// to work, professional certs) with expiry + a verification workflow (pending →
// verified / rejected). The compliance dashboard derives % compliant and the
// expiring-soon queue from these rows. Company-scoped.
export const complianceDocTypeEnum = pgEnum("compliance_doc_type", [
  "passport",
  "visa",
  "id_card",
  "driving_license",
  "work_permit",
  "certification",
  "medical",
  "other",
])

export const complianceDocStatusEnum = pgEnum("compliance_doc_status", [
  "pending",
  "verified",
  "rejected",
])

export const employeeDocuments = pgTable(
  "employee_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    docType: complianceDocTypeEnum("doc_type").notNull().default("other"),
    title: varchar("title", { length: 160 }).notNull(),
    reference: varchar("reference", { length: 120 }),
    issuedDate: date("issued_date"),
    expiryDate: date("expiry_date"),
    status: complianceDocStatusEnum("status").notNull().default("pending"),
    // Optional link to the uploaded file in the Document Center.
    documentId: uuid("document_id"),
    notes: text("notes"),
    verifiedByUserId: uuid("verified_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_documents_company_id_idx").on(table.companyId),
    index("employee_documents_user_id_idx").on(table.userId),
    index("employee_documents_expiry_idx").on(table.expiryDate),
  ]
)

export const employeeDocumentsRelations = relations(employeeDocuments, ({ one }) => ({
  company: one(companies, { fields: [employeeDocuments.companyId], references: [companies.id] }),
  user: one(users, { fields: [employeeDocuments.userId], references: [users.id] }),
}))

export type ComplianceDocType = (typeof complianceDocTypeEnum.enumValues)[number]
export type ComplianceDocStatus = (typeof complianceDocStatusEnum.enumValues)[number]
