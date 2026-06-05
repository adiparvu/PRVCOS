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

// ─── Social Profiles (P-29) ──────────────────────────────────────────────────

export const socialPlatformEnum = pgEnum("social_platform", [
  "linkedin",
  "twitter",
  "instagram",
  "github",
  "website",
  "facebook",
  "youtube",
  "tiktok",
  "other",
])

export const socialProfiles = pgTable(
  "social_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    platform: socialPlatformEnum("platform").notNull(),
    url: text("url").notNull(),
    displayName: varchar("display_name", { length: 255 }),

    // GDPR consent — explicit per-field opt-in required before any profile is visible
    isPublic: boolean("is_public").notNull().default(false),
    consentGiven: boolean("consent_given").notNull().default(false),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentWithdrawnAt: timestamp("consent_withdrawn_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("social_profiles_user_platform_unique").on(table.userId, table.platform),
    index("social_profiles_user_id_idx").on(table.userId),
    index("social_profiles_company_id_idx").on(table.companyId),
  ]
)

// ─── User Presence (P-29) ────────────────────────────────────────────────────

export const presenceStatusEnum = pgEnum("presence_status", [
  "online",
  "away",
  "busy",
  "offline",
  "in_meeting",
  "on_break",
  "do_not_disturb",
])

export const userPresence = pgTable(
  "user_presence",
  {
    // One row per user — upserted on status change
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    status: presenceStatusEnum("status").notNull().default("offline"),
    statusMessage: varchar("status_message", { length: 255 }),
    statusEmoji: varchar("status_emoji", { length: 10 }),

    // Whether the user manually set this (vs system-derived)
    isManualOverride: boolean("is_manual_override").notNull().default(false),
    manualOverrideExpiresAt: timestamp("manual_override_expires_at", { withTimezone: true }),

    // Active context — populated by heartbeat
    platform: varchar("platform", { length: 20 }), // "web" | "mobile" | "desktop"
    activeRoute: varchar("active_route", { length: 500 }), // current page path
    activeEntityType: varchar("active_entity_type", { length: 100 }),
    activeEntityId: uuid("active_entity_id"),

    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("user_presence_company_id_idx").on(table.companyId)]
)

// ─── Digital Business Cards (P-29) ───────────────────────────────────────────

export const digitalBusinessCards = pgTable(
  "digital_business_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // One card per user — enforced by unique constraint
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Public slug for /card/:slug route
    publicSlug: varchar("public_slug", { length: 100 }).unique(),
    isPublic: boolean("is_public").notNull().default(false),

    // Card content (can differ from user profile)
    headline: varchar("headline", { length: 255 }),
    bio: text("bio"),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 254 }),
    avatarUrl: text("avatar_url"),

    // Ordered list of { label, url, type } objects
    customLinks: jsonb("custom_links").notNull().default([]),

    // Analytics
    viewCount: integer("view_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("digital_business_cards_company_id_idx").on(table.companyId),
    index("digital_business_cards_public_slug_idx").on(table.publicSlug),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const socialProfilesRelations = relations(socialProfiles, ({ one }) => ({
  user: one(users, { fields: [socialProfiles.userId], references: [users.id] }),
  company: one(companies, { fields: [socialProfiles.companyId], references: [companies.id] }),
}))

export const userPresenceRelations = relations(userPresence, ({ one }) => ({
  user: one(users, { fields: [userPresence.userId], references: [users.id] }),
  company: one(companies, { fields: [userPresence.companyId], references: [companies.id] }),
}))

export const digitalBusinessCardsRelations = relations(digitalBusinessCards, ({ one }) => ({
  user: one(users, { fields: [digitalBusinessCards.userId], references: [users.id] }),
  company: one(companies, {
    fields: [digitalBusinessCards.companyId],
    references: [companies.id],
  }),
}))
