import { pgTable, uuid, pgEnum, boolean, timestamp, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./users"

export const themeEnum = pgEnum("theme", ["light", "dark", "system"])
export const glassStyleEnum = pgEnum("glass_style", ["translucid", "tinted", "adaptive"])

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    theme: themeEnum("theme").notNull().default("system"),
    glassStyle: glassStyleEnum("glass_style").notNull().default("adaptive"),
    syncEnabled: boolean("sync_enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (table) => [index("user_preferences_user_id_idx").on(table.userId)]
)

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}))

export type Theme = (typeof themeEnum.enumValues)[number]
export type GlassStyle = (typeof glassStyleEnum.enumValues)[number]

export interface AppearancePrefs {
  theme: Theme
  glassStyle: GlassStyle
  syncEnabled: boolean
}

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  theme: "system",
  glassStyle: "adaptive",
  syncEnabled: true,
}
