import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  numeric,
  pgEnum,
  index,
  date,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies, stores } from "./companies"
import { users } from "./users"
import { projects } from "./projects"

// ─── Vehicles ────────────────────────────────────────────────────────────────

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "car",
  "van",
  "truck",
  "motorcycle",
  "other",
])

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "active",
  "maintenance",
  "retired",
  "sold",
])

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),

    type: vehicleTypeEnum("type").notNull().default("car"),
    status: vehicleStatusEnum("status").notNull().default("active"),

    make: varchar("make", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    year: integer("year"),
    licensePlate: varchar("license_plate", { length: 20 }).notNull(),
    vin: varchar("vin", { length: 17 }),
    color: varchar("color", { length: 50 }),
    fuelType: varchar("fuel_type", { length: 50 }),

    mileageKm: integer("mileage_km").notNull().default(0),
    fuelLevelPct: integer("fuel_level_pct"),
    nextServiceAtKm: integer("next_service_at_km"),
    insuranceExpiresAt: timestamp("insurance_expires_at", { withTimezone: true }),
    itpExpiresAt: timestamp("itp_expires_at", { withTimezone: true }),

    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("vehicles_company_id_idx").on(table.companyId),
    index("vehicles_assigned_user_id_idx").on(table.assignedUserId),
  ]
)

// ─── Tools ───────────────────────────────────────────────────────────────────

export const toolStatusEnum = pgEnum("tool_status", [
  "available",
  "in_use",
  "maintenance",
  "retired",
  "lost",
])

export const tools = pgTable(
  "tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),

    status: toolStatusEnum("status").notNull().default("available"),

    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    brand: varchar("brand", { length: 100 }),
    model: varchar("model", { length: 100 }),

    purchasedAt: timestamp("purchased_at", { withTimezone: true }),
    warrantyExpiresAt: timestamp("warranty_expires_at", { withTimezone: true }),
    lastServiceAt: timestamp("last_service_at", { withTimezone: true }),

    imageUrl: text("image_url"),
    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("tools_company_id_idx").on(table.companyId),
    index("tools_assigned_user_id_idx").on(table.assignedUserId),
  ]
)

// ─── Vehicle daily logs ───────────────────────────────────────────────────────

export const vehicleDailyLogs = pgTable(
  "vehicle_daily_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),

    date: date("date").notNull(),
    odometerKm: integer("odometer_km").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("vehicle_daily_logs_vehicle_date_unique").on(table.vehicleId, table.date),
    index("vehicle_daily_logs_company_id_idx").on(table.companyId),
    index("vehicle_daily_logs_vehicle_id_idx").on(table.vehicleId),
    index("vehicle_daily_logs_date_idx").on(table.date),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  company: one(companies, { fields: [vehicles.companyId], references: [companies.id] }),
  assignedUser: one(users, { fields: [vehicles.assignedUserId], references: [users.id] }),
  store: one(stores, { fields: [vehicles.storeId], references: [stores.id] }),
  dailyLogs: many(vehicleDailyLogs),
  trips: many(vehicleTrips),
}))

export const vehicleDailyLogsRelations = relations(vehicleDailyLogs, ({ one }) => ({
  vehicle: one(vehicles, { fields: [vehicleDailyLogs.vehicleId], references: [vehicles.id] }),
  company: one(companies, { fields: [vehicleDailyLogs.companyId], references: [companies.id] }),
  recordedBy: one(users, { fields: [vehicleDailyLogs.recordedBy], references: [users.id] }),
}))

export const toolsRelations = relations(tools, ({ one, many }) => ({
  company: one(companies, { fields: [tools.companyId], references: [companies.id] }),
  assignedUser: one(users, { fields: [tools.assignedUserId], references: [users.id] }),
  store: one(stores, { fields: [tools.storeId], references: [stores.id] }),
  checkouts: many(toolCheckouts),
}))

// ─── Tool checkouts (custody ledger) ──────────────────────────────────────────
// One row per checkout session: who took a tool, when it is due back, and — once
// returned — its condition and any damage. At most one open (unreturned) checkout
// exists per tool, enforced by a partial unique index (see migration 0045).

export const toolCheckoutStatusEnum = pgEnum("tool_checkout_status", ["open", "returned"])

export const toolCheckouts = pgTable(
  "tool_checkouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    // Custodian — the employee who has the tool while it is out.
    custodianId: uuid("custodian_id").references(() => users.id, { onDelete: "set null" }),
    // Actors who performed the checkout / return (audit trail).
    checkedOutBy: uuid("checked_out_by").references(() => users.id, { onDelete: "set null" }),
    returnedBy: uuid("returned_by").references(() => users.id, { onDelete: "set null" }),

    status: toolCheckoutStatusEnum("status").notNull().default("open"),

    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }).notNull().defaultNow(),
    expectedReturnAt: timestamp("expected_return_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),

    checkoutNotes: text("checkout_notes"),
    returnConditionNotes: text("return_condition_notes"),
    damageReported: boolean("damage_reported").notNull().default(false),
    damageNotes: text("damage_notes"),

    // Custody-overdue reminder (Phase 22.1). Stamped once when the daily sweep
    // first finds an open checkout past its expectedReturnAt, so the custodian
    // is reminded exactly once (claim-on-null). Returning the tool closes the
    // checkout, removing it from the candidate set.
    overdueNotifiedAt: timestamp("overdue_notified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tool_checkouts_company_id_idx").on(table.companyId),
    index("tool_checkouts_tool_id_idx").on(table.toolId),
    index("tool_checkouts_custodian_id_idx").on(table.custodianId),
  ]
)

export const toolCheckoutsRelations = relations(toolCheckouts, ({ one }) => ({
  company: one(companies, { fields: [toolCheckouts.companyId], references: [companies.id] }),
  tool: one(tools, { fields: [toolCheckouts.toolId], references: [tools.id] }),
  custodian: one(users, { fields: [toolCheckouts.custodianId], references: [users.id] }),
}))

// ─── Vehicle trips ────────────────────────────────────────────────────────────
// A single vehicle journey: who drove, for what (optionally against a project),
// with start/end odometer readings from which distance and fuel cost-per-km are
// derived. Status moves in_progress → completed | cancelled, one way only.

export const vehicleTripStatusEnum = pgEnum("vehicle_trip_status", [
  "in_progress",
  "completed",
  "cancelled",
])

export const vehicleTrips = pgTable(
  "vehicle_trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    driverId: uuid("driver_id").references(() => users.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),

    status: vehicleTripStatusEnum("status").notNull().default("in_progress"),
    purpose: varchar("purpose", { length: 255 }),

    startOdometerKm: integer("start_odometer_km").notNull(),
    endOdometerKm: integer("end_odometer_km"),
    distanceKm: integer("distance_km"),
    fuelCost: numeric("fuel_cost", { precision: 12, scale: 2 }),

    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("vehicle_trips_company_id_idx").on(table.companyId),
    index("vehicle_trips_vehicle_id_idx").on(table.vehicleId),
    index("vehicle_trips_driver_id_idx").on(table.driverId),
    index("vehicle_trips_project_id_idx").on(table.projectId),
  ]
)

export const vehicleTripsRelations = relations(vehicleTrips, ({ one }) => ({
  company: one(companies, { fields: [vehicleTrips.companyId], references: [companies.id] }),
  vehicle: one(vehicles, { fields: [vehicleTrips.vehicleId], references: [vehicles.id] }),
  driver: one(users, { fields: [vehicleTrips.driverId], references: [users.id] }),
  project: one(projects, { fields: [vehicleTrips.projectId], references: [projects.id] }),
}))
