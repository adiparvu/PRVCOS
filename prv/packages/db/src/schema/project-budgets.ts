import { pgTable, uuid, numeric, text, timestamp, pgEnum, index, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { projects } from "./projects"

// Project budget categories (roadmap 6.4).
export const projectBudgetCategoryEnum = pgEnum("project_budget_category", [
  "labor",
  "materials",
  "equipment",
  "overhead",
  "contingency",
])

// Project Budget Lines (roadmap 6.4) — the budget-by-category breakdown for a
// project. Each line tracks three figures that drive Earned Value Analysis:
//   planned   → the category's slice of Budget at Completion (BAC)
//   committed → approved POs/contracts not yet paid
//   actual    → costs actually incurred (paid invoices/expenses)
// Company-scoped; one line per (project, category).
export const projectBudgetLines = pgTable(
  "project_budget_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    category: projectBudgetCategoryEnum("category").notNull(),
    plannedAmount: numeric("planned_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    committedAmount: numeric("committed_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    actualAmount: numeric("actual_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("project_budget_lines_project_category_unique").on(table.projectId, table.category),
    index("project_budget_lines_company_id_idx").on(table.companyId),
    index("project_budget_lines_project_id_idx").on(table.projectId),
  ]
)

export const projectBudgetLinesRelations = relations(projectBudgetLines, ({ one }) => ({
  company: one(companies, {
    fields: [projectBudgetLines.companyId],
    references: [companies.id],
  }),
  project: one(projects, {
    fields: [projectBudgetLines.projectId],
    references: [projects.id],
  }),
}))

export type ProjectBudgetCategory = (typeof projectBudgetCategoryEnum.enumValues)[number]
