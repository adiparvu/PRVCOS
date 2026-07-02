import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  numeric,
  integer,
  date,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { clients } from "./clients"
import { stores } from "./companies"

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled",
  "archived",
])

export const projectMemberRoleEnum = pgEnum("project_member_role", [
  "owner",
  "manager",
  "worker",
  "observer",
])

export const projectTypeEnum = pgEnum("project_type", [
  "renovation",
  "installation",
  "maintenance",
  "consultation",
  "other",
])

export const projectPriorityEnum = pgEnum("project_priority", ["critical", "high", "medium", "low"])

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),

    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("draft"),
    type: projectTypeEnum("type").notNull().default("renovation"),
    priority: projectPriorityEnum("priority").notNull().default("medium"),

    projectManagerId: uuid("project_manager_id").references(() => users.id, {
      onDelete: "set null",
    }),
    projectDirectorId: uuid("project_director_id").references(() => users.id, {
      onDelete: "set null",
    }),

    budget: numeric("budget", { precision: 12, scale: 2 }),
    approvedBudget: numeric("approved_budget", { precision: 12, scale: 2 }),
    spentBudget: numeric("spent_budget", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    startDate: date("start_date"),
    dueDate: date("due_date"),
    actualStartDate: date("actual_start_date"),
    actualEndDate: date("actual_end_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Cached 0–100 health score (computed from budget EVA, task progress, risk
    // severity and schedule); refreshed by GET /api/projects/[id]/health.
    healthScore: integer("health_score"),

    tags: jsonb("tags").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("projects_company_id_idx").on(table.companyId),
    index("projects_client_id_idx").on(table.clientId),
    index("projects_owner_id_idx").on(table.ownerId),
    index("projects_status_idx").on(table.status),
    index("projects_manager_id_idx").on(table.projectManagerId),
  ]
)

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectMemberRoleEnum("role").notNull().default("worker"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("project_members_unique").on(table.projectId, table.userId),
    index("project_members_project_id_idx").on(table.projectId),
    index("project_members_user_id_idx").on(table.userId),
  ]
)

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    isComplete: boolean("is_complete").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("project_milestones_project_id_idx").on(table.projectId)]
)

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, { fields: [projects.companyId], references: [companies.id] }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  store: one(stores, { fields: [projects.storeId], references: [stores.id] }),
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  members: many(projectMembers),
  milestones: many(projectMilestones),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}))

export const projectMilestonesRelations = relations(projectMilestones, ({ one }) => ({
  project: one(projects, { fields: [projectMilestones.projectId], references: [projects.id] }),
}))
