import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { projects } from "./projects"

// Project Resource Allocations (roadmap 6.3) — assigns an employee to a project
// at a given capacity (allocationPercentage). Summing a user's active
// allocations across all projects yields their utilization; > 100 flags an
// over-allocation conflict. Company-scoped; one row per (project, user).
export const projectAllocations = pgTable(
  "project_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Share of the employee's capacity committed to this project (0–100).
    allocationPercentage: integer("allocation_percentage").notNull().default(0),
    // Free-form role on the project, e.g. "Lead Electrician".
    roleLabel: varchar("role_label", { length: 120 }),
    // Allocation window. A null endDate means open-ended (still active).
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("project_allocations_project_user_unique").on(table.projectId, table.userId),
    index("project_allocations_company_id_idx").on(table.companyId),
    index("project_allocations_project_id_idx").on(table.projectId),
    index("project_allocations_user_id_idx").on(table.userId),
  ]
)

export const projectAllocationsRelations = relations(projectAllocations, ({ one }) => ({
  company: one(companies, {
    fields: [projectAllocations.companyId],
    references: [companies.id],
  }),
  project: one(projects, {
    fields: [projectAllocations.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [projectAllocations.userId], references: [users.id] }),
}))
