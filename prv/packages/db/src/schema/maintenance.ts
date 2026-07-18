import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// ─── Asset maintenance records (Phase 22.4) ───────────────────────────────────
// One shared ledger for vehicle and tool maintenance. Polymorphic by
// (assetType, assetId) rather than a hard FK, so both fleet and tool routes
// write here without a join table. A record is out-of-service work while
// scheduled/in_progress and history once completed/cancelled.

export const maintenanceAssetTypeEnum = pgEnum("maintenance_asset_type", ["vehicle", "tool"])
export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
])

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    assetType: maintenanceAssetTypeEnum("asset_type").notNull(),
    assetId: uuid("asset_id").notNull(),

    type: varchar("type", { length: 60 }).notNull(),
    status: maintenanceStatusEnum("status").notNull().default("scheduled"),

    description: text("description"),
    provider: varchar("provider", { length: 255 }),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    odometerKm: integer("odometer_km"),

    scheduledDate: date("scheduled_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("maintenance_records_company_id_idx").on(table.companyId),
    index("maintenance_records_asset_idx").on(table.assetType, table.assetId),
    index("maintenance_records_status_idx").on(table.status),
  ]
)

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  company: one(companies, { fields: [maintenanceRecords.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [maintenanceRecords.createdById], references: [users.id] }),
}))
