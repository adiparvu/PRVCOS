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
import { projects } from "./projects"
import { users } from "./users"

// Risk register (roadmap 6.6).
export const projectRiskCategoryEnum = pgEnum("project_risk_category", [
  "schedule",
  "cost",
  "quality",
  "safety",
  "resource",
  "external",
  "other",
])

export const projectRiskStatusEnum = pgEnum("project_risk_status", [
  "open",
  "mitigating",
  "monitoring",
  "closed",
  "accepted",
])

// project_risks — per-project risk register. impact + probability (each 1–5)
// drive a 1–25 severity score (computed in the app layer). Company-scoped.
export const projectRisks = pgTable(
  "project_risks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: projectRiskCategoryEnum("category").notNull().default("other"),
    impact: integer("impact").notNull().default(1),
    probability: integer("probability").notNull().default(1),
    mitigation: text("mitigation"),
    status: projectRiskStatusEnum("status").notNull().default("open"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_risks_company_id_idx").on(table.companyId),
    index("project_risks_project_id_idx").on(table.projectId),
    index("project_risks_owner_id_idx").on(table.ownerId),
  ]
)

export const projectRisksRelations = relations(projectRisks, ({ one }) => ({
  company: one(companies, { fields: [projectRisks.companyId], references: [companies.id] }),
  project: one(projects, { fields: [projectRisks.projectId], references: [projects.id] }),
  owner: one(users, { fields: [projectRisks.ownerId], references: [users.id] }),
}))

export type ProjectRiskCategory = (typeof projectRiskCategoryEnum.enumValues)[number]
export type ProjectRiskStatus = (typeof projectRiskStatusEnum.enumValues)[number]
