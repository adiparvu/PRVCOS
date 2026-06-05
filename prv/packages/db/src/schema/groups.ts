import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  numeric,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// ─── company_groups ────────────────────────────────────────────────────────
// A group is a named collection of companies (e.g., "PRV Group")

export const companyGroups = pgTable(
  "company_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    logoUrl: text("logo_url"),

    // The user who owns/manages this group (Group CEO)
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),

    settings: jsonb("settings").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("company_groups_owner_idx").on(table.ownerId),
    index("company_groups_slug_idx").on(table.slug),
  ]
)

// ─── group_memberships ────────────────────────────────────────────────────────
// Which companies belong to which group

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => companyGroups.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),

    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("group_memberships_group_company_unique").on(table.groupId, table.companyId),
    index("group_memberships_group_id_idx").on(table.groupId),
    index("group_memberships_company_id_idx").on(table.companyId),
  ]
)

// ─── group_kpi_snapshots ──────────────────────────────────────────────────────
// Nightly aggregated KPIs across all companies in a group (02:00 UTC)

export const groupKpiSnapshots = pgTable(
  "group_kpi_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => companyGroups.id, { onDelete: "cascade" }),
    snapshotDate: varchar("snapshot_date", { length: 10 }).notNull(), // YYYY-MM-DD (UTC)

    // Aggregated across all active group companies
    totalRevenue: numeric("total_revenue", { precision: 19, scale: 4 }).notNull().default("0"),
    totalActiveProjects: varchar("total_active_projects", { length: 20 }).notNull().default("0"),
    totalActiveEmployees: varchar("total_active_employees", { length: 20 }).notNull().default("0"),
    totalOpenAlerts: varchar("total_open_alerts", { length: 20 }).notNull().default("0"),

    // Per-company breakdown
    companyBreakdown: jsonb("company_breakdown").notNull().default([]),

    // Aggregation meta
    companiesIncluded: varchar("companies_included", { length: 20 }).notNull().default("0"),
    aggregatedAt: timestamp("aggregated_at", { withTimezone: true }).notNull().defaultNow(),
    durationMs: varchar("duration_ms", { length: 20 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("group_kpi_snapshots_group_date_unique").on(table.groupId, table.snapshotDate),
    index("group_kpi_snapshots_group_id_idx").on(table.groupId),
    index("group_kpi_snapshots_date_idx").on(table.snapshotDate),
  ]
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const companyGroupsRelations = relations(companyGroups, ({ one, many }) => ({
  owner: one(users, { fields: [companyGroups.ownerId], references: [users.id] }),
  memberships: many(groupMemberships),
  kpiSnapshots: many(groupKpiSnapshots),
}))

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  group: one(companyGroups, {
    fields: [groupMemberships.groupId],
    references: [companyGroups.id],
  }),
  company: one(companies, {
    fields: [groupMemberships.companyId],
    references: [companies.id],
  }),
  addedByUser: one(users, {
    fields: [groupMemberships.addedBy],
    references: [users.id],
  }),
}))

export const groupKpiSnapshotsRelations = relations(groupKpiSnapshots, ({ one }) => ({
  group: one(companyGroups, {
    fields: [groupKpiSnapshots.groupId],
    references: [companyGroups.id],
  }),
}))
