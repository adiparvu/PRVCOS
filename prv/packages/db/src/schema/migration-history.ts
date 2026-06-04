import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core"

export const migrationHistory = pgTable("migration_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: varchar("version", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  appliedBy: varchar("applied_by", { length: 100 }).notNull().default("system"),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  executionTimeMs: text("execution_time_ms"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
})
