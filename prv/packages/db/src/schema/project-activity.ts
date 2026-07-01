import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { projects } from "./projects"
import { users } from "./users"

// Project activity feed (roadmap 6.7). A dedicated per-project timeline —
// distinct from the immutable company audit log — that records human-readable
// events (task/milestone/member/budget/risk changes, status transitions, and
// free-text comments) for display in the project detail.
export const projectActivityKindEnum = pgEnum("project_activity_kind", [
  "task",
  "milestone",
  "member",
  "budget",
  "risk",
  "status",
  "comment",
  "document",
  "general",
])

export const projectActivity = pgTable(
  "project_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: projectActivityKindEnum("kind").notNull().default("general"),
    summary: text("summary").notNull(),
    // The referenced thing, if any (e.g. entityType "task", entityId "<uuid>").
    entityType: varchar("entity_type", { length: 48 }),
    entityId: varchar("entity_id", { length: 128 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_activity_project_id_idx").on(table.projectId),
    index("project_activity_project_created_idx").on(table.projectId, table.createdAt),
    index("project_activity_company_id_idx").on(table.companyId),
  ]
)

export const projectActivityRelations = relations(projectActivity, ({ one }) => ({
  company: one(companies, { fields: [projectActivity.companyId], references: [companies.id] }),
  project: one(projects, { fields: [projectActivity.projectId], references: [projects.id] }),
  actor: one(users, { fields: [projectActivity.actorId], references: [users.id] }),
}))

export type ProjectActivityKind = (typeof projectActivityKindEnum.enumValues)[number]
