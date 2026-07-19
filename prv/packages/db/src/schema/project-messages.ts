import { pgTable, uuid, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { projects } from "./projects"
import { users } from "./users"
import { portalAccounts } from "./portal"

// ─── Project message thread (Phase 23.6) ──────────────────────────────────────
// A per-project conversation between the client (via their portal account) and
// company staff (via their user). Used for the portal "progress updates / client
// question thread".

export const projectMessageAuthorEnum = pgEnum("project_message_author", ["client", "staff"])

export const projectMessages = pgTable(
  "project_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    authorType: projectMessageAuthorEnum("author_type").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    authorPortalAccountId: uuid("author_portal_account_id").references(() => portalAccounts.id, {
      onDelete: "set null",
    }),

    body: text("body").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_messages_project_id_idx").on(table.projectId),
    index("project_messages_company_id_idx").on(table.companyId),
  ]
)

export const projectMessagesRelations = relations(projectMessages, ({ one }) => ({
  company: one(companies, { fields: [projectMessages.companyId], references: [companies.id] }),
  project: one(projects, { fields: [projectMessages.projectId], references: [projects.id] }),
  authorUser: one(users, { fields: [projectMessages.authorUserId], references: [users.id] }),
  authorPortalAccount: one(portalAccounts, {
    fields: [projectMessages.authorPortalAccountId],
    references: [portalAccounts.id],
  }),
}))
