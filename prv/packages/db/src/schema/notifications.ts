import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// ─── Push Tokens ─────────────────────────────────────────────────────────────
// Stores Expo push tokens per user/device. One user may have multiple devices.

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Expo push token — format: ExponentPushToken[xxxxxx]
    token: varchar("token", { length: 200 }).notNull(),

    // Device identifier for deduplication (Expo device ID)
    deviceId: varchar("device_id", { length: 200 }).notNull(),

    // Platform for analytics/debugging
    platform: varchar("platform", { length: 10 }).notNull().default("unknown"),

    isActive: boolean("is_active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One active token per device
    unique("push_tokens_device_unique").on(table.deviceId),
    index("push_tokens_user_id_idx").on(table.userId),
    index("push_tokens_company_id_idx").on(table.companyId),
    index("push_tokens_is_active_idx").on(table.isActive),
  ]
)

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

    // SLA escalation (Phase 14.6). When an action_required notification stays
    // unread AND undismissed past a company escalation policy's threshold, the
    // hourly cron escalates it — creating a NEW notification for the policy's
    // named target — and stamps this so it escalates at most once. This column
    // is only ever set on the ORIGINAL notification, never the escalation copy.
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),

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

// ─── Escalation policies (Phase 14.6) ────────────────────────────────────────
// Admin-declared SLA rules. An action_required notification that stays unread
// AND undismissed for longer than `slaMinutes` is escalated to `escalateToUserId`
// — an EXPLICIT, admin-chosen recipient. The platform never guesses an org chart
// or "who the manager is"; the target is always named on the policy. An optional
// `entityType` scopes the rule (e.g. only "safety_permit" notifications); null
// applies to every action_required notification in the company.
export const notificationEscalationPolicies = pgTable(
  "notification_escalation_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 200 }).notNull(),

    // null = applies to all action_required notifications; otherwise scopes to
    // notifications whose entityType matches (e.g. "safety_permit", "approval").
    entityType: varchar("entity_type", { length: 100 }),

    // How long a notification may stay unacknowledged before escalating.
    slaMinutes: integer("sla_minutes").notNull().default(60),

    // The explicit, admin-chosen recipient of the escalation notification.
    escalateToUserId: uuid("escalate_to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    isActive: boolean("is_active").notNull().default(true),

    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notif_escalation_policies_company_id_idx").on(table.companyId),
    index("notif_escalation_policies_active_idx").on(table.companyId, table.isActive),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const notificationEscalationPoliciesRelations = relations(
  notificationEscalationPolicies,
  ({ one }) => ({
    company: one(companies, {
      fields: [notificationEscalationPolicies.companyId],
      references: [companies.id],
    }),
    escalateTo: one(users, {
      fields: [notificationEscalationPolicies.escalateToUserId],
      references: [users.id],
    }),
  })
)

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

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, { fields: [pushTokens.userId], references: [users.id] }),
  company: one(companies, { fields: [pushTokens.companyId], references: [companies.id] }),
}))
