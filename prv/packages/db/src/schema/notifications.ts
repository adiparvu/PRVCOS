import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

export const notificationTypeEnum = pgEnum("notification_type", [
  "info",
  "warning",
  "error",
  "success",
  "action_required",
])

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "push",
  "email",
  "sms",
])

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    type: notificationTypeEnum("type").notNull().default("info"),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),

    title: varchar("title", { length: 500 }).notNull(),
    body: text("body"),
    actionUrl: text("action_url"),
    imageUrl: text("image_url"),

    // Entity link for deep navigation
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),

    // Delivery state
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    // Scheduling
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_company_id_idx").on(table.companyId),
    index("notifications_is_read_idx").on(table.isRead),
    index("notifications_created_at_idx").on(table.createdAt),
  ]
)

// Per-user, per-company channel preferences
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Which channels are enabled per notification type
    inApp: boolean("in_app").notNull().default(true),
    push: boolean("push").notNull().default(true),
    email: boolean("email").notNull().default(true),
    sms: boolean("sms").notNull().default(false),

    // Quiet hours (stored as "HH:MM" in user's timezone)
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("notification_preferences_user_company_unique").on(table.userId, table.companyId),
    index("notification_preferences_user_id_idx").on(table.userId),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  company: one(companies, { fields: [notifications.companyId], references: [companies.id] }),
}))

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
  company: one(companies, {
    fields: [notificationPreferences.companyId],
    references: [companies.id],
  }),
}))
