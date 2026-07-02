import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { clients } from "./clients"
import { users } from "./users"

// CRM activities (roadmap 10.4). A scheduled/logged touchpoint against a lead
// or customer (both live in `clients`) — calls, emails, meetings, demos,
// proposals, follow-ups, notes and tasks — with an optional due date and a
// completion timestamp + outcome once the activity is done.
export const crmActivityTypeEnum = pgEnum("crm_activity_type", [
  "call",
  "email",
  "meeting",
  "demo",
  "proposal",
  "follow_up",
  "note",
  "task",
])

export const crmActivities = pgTable(
  "crm_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),

    type: crmActivityTypeEnum("type").notNull().default("note"),
    subject: varchar("subject", { length: 255 }).notNull(),
    notes: text("notes"),
    outcome: text("outcome"),

    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("crm_activities_company_id_idx").on(table.companyId),
    index("crm_activities_client_id_idx").on(table.clientId),
    index("crm_activities_due_at_idx").on(table.dueAt),
  ]
)

export const crmActivitiesRelations = relations(crmActivities, ({ one }) => ({
  company: one(companies, { fields: [crmActivities.companyId], references: [companies.id] }),
  client: one(clients, { fields: [crmActivities.clientId], references: [clients.id] }),
  actor: one(users, { fields: [crmActivities.actorId], references: [users.id] }),
}))

export type CrmActivityType = (typeof crmActivityTypeEnum.enumValues)[number]
export type CrmActivity = typeof crmActivities.$inferSelect
export type NewCrmActivity = typeof crmActivities.$inferInsert
