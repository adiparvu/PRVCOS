import {
  pgTable,
  uuid,
  varchar,
  date,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"

// Public holidays (roadmap 7.3). Per-company holiday calendar used to exclude
// non-working days from leave/working-day counts. A recurring holiday repeats on
// the same month-day every year (e.g. national days); a one-off applies only to
// its stored year. Company-scoped.
export const publicHolidays = pgTable(
  "public_holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    date: date("date").notNull(),
    country: varchar("country", { length: 8 }).notNull().default("RO"),
    region: varchar("region", { length: 80 }),
    isRecurring: boolean("is_recurring").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("public_holidays_company_date_country_unique").on(
      table.companyId,
      table.date,
      table.country
    ),
    index("public_holidays_company_id_idx").on(table.companyId),
    index("public_holidays_date_idx").on(table.date),
  ]
)

export const publicHolidaysRelations = relations(publicHolidays, ({ one }) => ({
  company: one(companies, { fields: [publicHolidays.companyId], references: [companies.id] }),
}))
