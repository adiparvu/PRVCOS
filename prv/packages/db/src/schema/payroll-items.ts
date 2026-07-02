import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { payrollRuns } from "./workforce"

// Payroll line items (roadmap 8.2). One row per employee per payroll run — the
// per-employee payslip. Gross = base + overtime + bonus + allowance; net =
// gross − deduction (see lib/payslip.ts). Run header totals are derived by
// summing these lines. Company-scoped; one line per (run, user).
export const payrollItems = pgTable(
  "payroll_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    baseAmount: numeric("base_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    overtimeHours: numeric("overtime_hours", { precision: 8, scale: 2 }).notNull().default("0"),
    overtimeAmount: numeric("overtime_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    bonusAmount: numeric("bonus_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    allowanceAmount: numeric("allowance_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    deductionAmount: numeric("deduction_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("payroll_items_run_user_unique").on(table.runId, table.userId),
    index("payroll_items_company_id_idx").on(table.companyId),
    index("payroll_items_run_id_idx").on(table.runId),
    index("payroll_items_user_id_idx").on(table.userId),
  ]
)

export const payrollItemsRelations = relations(payrollItems, ({ one }) => ({
  company: one(companies, { fields: [payrollItems.companyId], references: [companies.id] }),
  run: one(payrollRuns, { fields: [payrollItems.runId], references: [payrollRuns.id] }),
  user: one(users, { fields: [payrollItems.userId], references: [users.id] }),
}))
