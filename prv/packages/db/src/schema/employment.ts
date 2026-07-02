import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  pgEnum,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// Employment contracts (roadmap 8.1). The full employment lifecycle: an
// employee's contract with type, dates, salary snapshot, and a version chain
// (amendments create a new version and supersede the prior one; history is
// kept). Company-scoped.
export const employmentContractTypeEnum = pgEnum("employment_contract_type", [
  "permanent",
  "fixed_term",
  "contractor",
  "intern",
])

export const employmentContractStatusEnum = pgEnum("employment_contract_status", [
  "draft",
  "active",
  "expired",
  "terminated",
  "superseded",
])

export const employmentPayPeriodEnum = pgEnum("employment_pay_period", [
  "hourly",
  "monthly",
  "annual",
])

export const employmentContracts = pgTable(
  "employment_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: employmentContractTypeEnum("type").notNull().default("permanent"),
    status: employmentContractStatusEnum("status").notNull().default("draft"),
    roleTitle: varchar("role_title", { length: 160 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"), // fixed-term / contractor / intern
    salaryAmount: numeric("salary_amount", { precision: 12, scale: 2 }),
    salaryCurrency: varchar("salary_currency", { length: 3 }).notNull().default("RON"),
    payPeriod: employmentPayPeriodEnum("pay_period").notNull().default("monthly"),
    noticePeriodDays: integer("notice_period_days"),
    terms: text("terms"),
    version: integer("version").notNull().default(1),
    supersedesId: uuid("supersedes_id").references((): AnyPgColumn => employmentContracts.id, {
      onDelete: "set null",
    }),
    // Termination record.
    terminationReason: text("termination_reason"),
    terminationDate: date("termination_date"),
    finalWorkingDay: date("final_working_day"),
    // Digital signing (Document Center integration lands later).
    signedAt: timestamp("signed_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employment_contracts_company_id_idx").on(table.companyId),
    index("employment_contracts_user_id_idx").on(table.userId),
    index("employment_contracts_status_idx").on(table.status),
    index("employment_contracts_end_date_idx").on(table.endDate),
  ]
)

export const employmentContractsRelations = relations(employmentContracts, ({ one }) => ({
  company: one(companies, { fields: [employmentContracts.companyId], references: [companies.id] }),
  user: one(users, { fields: [employmentContracts.userId], references: [users.id] }),
}))

export type EmploymentContractType = (typeof employmentContractTypeEnum.enumValues)[number]
export type EmploymentContractStatus = (typeof employmentContractStatusEnum.enumValues)[number]
