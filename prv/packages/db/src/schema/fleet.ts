import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { stores } from "./companies"

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

    mileageKm: integer("mileage_km").notNull().default(0),
    lastServiceDate: date("last_service_date"),
    nextServiceDate: date("next_service_date"),
    insuranceExpiresAt: date("insurance_expires_at"),
    inspectionExpiresAt: date("inspection_expires_at"),

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
    brand: varchar("brand", { length: 100 }),
    model: varchar("model", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),

    purchasedAt: date("purchased_at"),
    warrantyExpiresAt: date("warranty_expires_at"),
    lastMaintenanceDate: date("last_maintenance_date"),
    nextMaintenanceDate: date("next_maintenance_date"),

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
    index("tools_status_idx").on(table.status),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  company: one(companies, { fields: [vehicles.companyId], references: [companies.id] }),
  assignedUser: one(users, { fields: [vehicles.assignedUserId], references: [users.id] }),
  store: one(stores, { fields: [vehicles.storeId], references: [stores.id] }),
}))

export const toolsRelations = relations(tools, ({ one }) => ({
  company: one(companies, { fields: [tools.companyId], references: [companies.id] }),
  assignedUser: one(users, { fields: [tools.assignedUserId], references: [users.id] }),
  store: one(stores, { fields: [tools.storeId], references: [stores.id] }),
}))
