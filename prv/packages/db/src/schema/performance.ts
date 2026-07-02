import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// Manager performance ratings (roadmap 7.5). A qualitative 1–5 score per
// employee per review period (e.g. "2026-07" or "2026-Q3"), complementing the
// quantitative attendance/punctuality/task metrics the dashboard derives from
// existing data. Company-scoped; one rating per (user, period).
export const performanceRatings = pgTable(
  "performance_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ratedByUserId: uuid("rated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    period: varchar("period", { length: 20 }).notNull(),
    rating: integer("rating").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("performance_ratings_user_period_unique").on(table.userId, table.period),
    index("performance_ratings_company_id_idx").on(table.companyId),
    index("performance_ratings_user_id_idx").on(table.userId),
  ]
)

export const performanceRatingsRelations = relations(performanceRatings, ({ one }) => ({
  company: one(companies, { fields: [performanceRatings.companyId], references: [companies.id] }),
  user: one(users, { fields: [performanceRatings.userId], references: [users.id] }),
}))
