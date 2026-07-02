import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { departments } from "./companies"
import { employmentContractTypeEnum } from "./employment"

// Recruitment (roadmap 8.3). Job requisitions and the candidate pipeline
// (sourcing → screening → … → offer → hired / rejected). Company-scoped.
export const requisitionStatusEnum = pgEnum("requisition_status", [
  "open",
  "on_hold",
  "filled",
  "closed",
])

export const candidateStageEnum = pgEnum("candidate_stage", [
  "sourcing",
  "screening",
  "phone_screen",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
])

export const jobRequisitions = pgTable(
  "job_requisitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    employmentType: employmentContractTypeEnum("employment_type").notNull().default("permanent"),
    headcount: integer("headcount").notNull().default(1),
    status: requisitionStatusEnum("status").notNull().default("open"),
    hiringManagerId: uuid("hiring_manager_id").references(() => users.id, { onDelete: "set null" }),
    location: varchar("location", { length: 160 }),
    description: text("description"),
    openedAt: date("opened_at"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("job_requisitions_company_id_idx").on(table.companyId),
    index("job_requisitions_status_idx").on(table.status),
  ]
)

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    requisitionId: uuid("requisition_id")
      .notNull()
      .references(() => jobRequisitions.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 40 }),
    source: varchar("source", { length: 80 }),
    stage: candidateStageEnum("stage").notNull().default("sourcing"),
    rating: integer("rating"),
    cvUrl: varchar("cv_url", { length: 512 }),
    notes: text("notes"),
    appliedAt: date("applied_at"),
    orderIndex: integer("order_index").notNull().default(0),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("candidates_company_id_idx").on(table.companyId),
    index("candidates_requisition_id_idx").on(table.requisitionId),
    index("candidates_stage_idx").on(table.stage),
  ]
)

export const jobRequisitionsRelations = relations(jobRequisitions, ({ one, many }) => ({
  company: one(companies, { fields: [jobRequisitions.companyId], references: [companies.id] }),
  department: one(departments, {
    fields: [jobRequisitions.departmentId],
    references: [departments.id],
  }),
  hiringManager: one(users, {
    fields: [jobRequisitions.hiringManagerId],
    references: [users.id],
  }),
  candidates: many(candidates),
}))

export const candidatesRelations = relations(candidates, ({ one }) => ({
  company: one(companies, { fields: [candidates.companyId], references: [companies.id] }),
  requisition: one(jobRequisitions, {
    fields: [candidates.requisitionId],
    references: [jobRequisitions.id],
  }),
}))

export type RequisitionStatus = (typeof requisitionStatusEnum.enumValues)[number]
export type CandidateStage = (typeof candidateStageEnum.enumValues)[number]
