import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

export const approvalTypeEnum = pgEnum("approval_type", [
  "purchase",
  "leave",
  "expense",
  "contract",
  "overtime",
])

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "urgent",
  "expired",
  "approved",
  "rejected",
])

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    type: approvalTypeEnum("type").notNull(),
    ref: varchar("ref", { length: 50 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    value: numeric("value", { precision: 12, scale: 2 }),

    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    status: approvalStatusEnum("status").notNull().default("pending"),

    // Link to the underlying entity (PO, leave request, expense, etc.)
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("approval_requests_company_id_idx").on(table.companyId),
    index("approval_requests_status_idx").on(table.status),
    index("approval_requests_requested_by_idx").on(table.requestedByUserId),
    index("approval_requests_deadline_idx").on(table.deadline),
  ]
)

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  company: one(companies, { fields: [approvalRequests.companyId], references: [companies.id] }),
  requestedBy: one(users, {
    fields: [approvalRequests.requestedByUserId],
    references: [users.id],
    relationName: "approvalRequester",
  }),
  approvedBy: one(users, {
    fields: [approvalRequests.approvedByUserId],
    references: [users.id],
    relationName: "approvalApprover",
  }),
}))
