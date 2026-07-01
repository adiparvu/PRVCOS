import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./users"
import { companies } from "./companies"

// Universal Favorites (roadmap 5.7) — any entity in any module can be favorited
// by a user. Persisted server-side so favorites sync across a user's devices.
// Scoped to (company, user); a favorite is a pointer (entityType + entityId)
// plus a denormalized label/href snapshot so the palette can render + navigate
// without re-fetching every referenced entity.
export const userFavorites = pgTable(
  "user_favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Module/kind of the favorited thing: "project", "employee", "product",
    // "report", "invoice", "client", … — free-form to stay module-agnostic.
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: varchar("entity_id", { length: 128 }).notNull(),
    label: varchar("label", { length: 200 }).notNull(),
    href: varchar("href", { length: 512 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_favorites_user_id_idx").on(table.userId),
    index("user_favorites_company_id_idx").on(table.companyId),
    // A user favorites a given entity at most once.
    uniqueIndex("user_favorites_user_entity_unique").on(
      table.userId,
      table.entityType,
      table.entityId
    ),
  ]
)

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, { fields: [userFavorites.userId], references: [users.id] }),
  company: one(companies, { fields: [userFavorites.companyId], references: [companies.id] }),
}))

export interface FavoriteRecord {
  id: string
  entityType: string
  entityId: string
  label: string
  href: string
  createdAt: string
}
