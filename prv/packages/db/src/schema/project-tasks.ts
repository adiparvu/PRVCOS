import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { projects } from "./projects"
import { users } from "./users"

// Project task lifecycle (roadmap 6.2).
export const projectTaskStatusEnum = pgEnum("project_task_status", [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
])

export const projectTaskPriorityEnum = pgEnum("project_task_priority", [
  "low",
  "medium",
  "high",
  "critical",
])

// project_tasks — the Kanban-able task board for a project. Supports subtasks
// (one level via parentTaskId), a single blocking dependency (dependsOnTaskId),
// time tracking (estimated/actual hours), and per-column ordering (orderIndex).
export const projectTasks = pgTable(
  "project_tasks",
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
    status: projectTaskStatusEnum("status").notNull().default("backlog"),
    priority: projectTaskPriorityEnum("priority").notNull().default("medium"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    assignedById: uuid("assigned_by_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
    actualHours: numeric("actual_hours", { precision: 8, scale: 2 }),
    // Subtasks (one level) and a single blocking dependency. Self-references.
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => projectTasks.id, {
      onDelete: "cascade",
    }),
    dependsOnTaskId: uuid("depends_on_task_id").references((): AnyPgColumn => projectTasks.id, {
      onDelete: "set null",
    }),
    orderIndex: integer("order_index").notNull().default(0),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_tasks_company_id_idx").on(table.companyId),
    index("project_tasks_project_id_idx").on(table.projectId),
    index("project_tasks_project_status_idx").on(table.projectId, table.status),
    index("project_tasks_assignee_id_idx").on(table.assigneeId),
    index("project_tasks_parent_id_idx").on(table.parentTaskId),
  ]
)

export const projectTasksRelations = relations(projectTasks, ({ one, many }) => ({
  company: one(companies, { fields: [projectTasks.companyId], references: [companies.id] }),
  project: one(projects, { fields: [projectTasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [projectTasks.assigneeId], references: [users.id] }),
  parent: one(projectTasks, {
    fields: [projectTasks.parentTaskId],
    references: [projectTasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(projectTasks, { relationName: "subtasks" }),
}))

export type ProjectTaskStatus = (typeof projectTaskStatusEnum.enumValues)[number]
export type ProjectTaskPriority = (typeof projectTaskPriorityEnum.enumValues)[number]

// task_time_entries (Phase 6.2) — start/stop time tracking per task. An entry is
// "running" while ended_at is null; on stop its duration rolls into the task's
// actualHours. At most one running entry per user is enforced at the API layer.
export const taskTimeEntries = pgTable(
  "task_time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references((): AnyPgColumn => projectTasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("task_time_entries_task_id_idx").on(table.taskId),
    index("task_time_entries_user_id_idx").on(table.userId),
    index("task_time_entries_company_id_idx").on(table.companyId),
  ]
)

export const taskTimeEntriesRelations = relations(taskTimeEntries, ({ one }) => ({
  task: one(projectTasks, {
    fields: [taskTimeEntries.taskId],
    references: [projectTasks.id],
  }),
  user: one(users, { fields: [taskTimeEntries.userId], references: [users.id] }),
  company: one(companies, { fields: [taskTimeEntries.companyId], references: [companies.id] }),
}))

export type TaskTimeEntry = typeof taskTimeEntries.$inferSelect

// task_templates (Phase 6.2) — a reusable checklist of task definitions saved on
// the company and applied to any project to create tasks in bulk. Items are held
// as a normalized jsonb array (title/description/priority/estimatedHours).
export const taskTemplates = pgTable(
  "task_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    items: jsonb("items")
      .$type<
        {
          title: string
          description: string | null
          priority: string
          estimatedHours: string | null
        }[]
      >()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("task_templates_company_id_idx").on(table.companyId)]
)

export const taskTemplatesRelations = relations(taskTemplates, ({ one }) => ({
  company: one(companies, { fields: [taskTemplates.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [taskTemplates.createdByUserId], references: [users.id] }),
}))

export type TaskTemplate = typeof taskTemplates.$inferSelect

// recurring_tasks (Phase 6.2) — a rule that generates a task on a project on a
// daily/weekly/monthly cadence. An hourly sweep creates a backlog task for every
// due rule and advances next_run_at. Frequency is a plain varchar validated in
// code (shares the daily|weekly|monthly contract with report schedules).
export const recurringTasks = pgTable(
  "recurring_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: projectTaskPriorityEnum("priority").notNull().default("medium"),
    estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    frequency: varchar("frequency", { length: 10 }).notNull(), // daily | weekly | monthly
    sendHourUtc: integer("send_hour_utc").notNull().default(7),
    enabled: boolean("enabled").notNull().default(true),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("recurring_tasks_company_id_idx").on(table.companyId),
    index("recurring_tasks_project_id_idx").on(table.projectId),
    index("recurring_tasks_due_idx").on(table.enabled, table.nextRunAt),
  ]
)

export const recurringTasksRelations = relations(recurringTasks, ({ one }) => ({
  company: one(companies, { fields: [recurringTasks.companyId], references: [companies.id] }),
  project: one(projects, { fields: [recurringTasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [recurringTasks.assigneeId], references: [users.id] }),
}))

export type RecurringTask = typeof recurringTasks.$inferSelect
