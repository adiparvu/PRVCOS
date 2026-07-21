import { pgTable, uuid, varchar, text, date, timestamp, pgEnum, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"

// Lightweight equipment assignment tracking (roadmap 7.6). A deliberate
// placeholder ahead of the full Phase 22 asset registry: records which employee
// holds which piece of equipment, when it was issued, when it's due back, and
// its condition. Company-scoped.
export const equipmentConditionEnum = pgEnum("equipment_condition", [
  "new",
  "good",
  "fair",
  "poor",
  "damaged",
])

export const equipmentAssignmentStatusEnum = pgEnum("equipment_assignment_status", [
  "assigned",
  "returned",
  "lost",
])

export const equipmentAssignments = pgTable(
  "equipment_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    equipmentType: varchar("equipment_type", { length: 80 }).notNull(),
    label: varchar("label", { length: 160 }),
    serialNumber: varchar("serial_number", { length: 120 }),
    assignedDate: date("assigned_date").notNull(),
    expectedReturnDate: date("expected_return_date"),
    returnedDate: date("returned_date"),
    condition: equipmentConditionEnum("condition").notNull().default("good"),
    returnCondition: equipmentConditionEnum("return_condition"),
    status: equipmentAssignmentStatusEnum("status").notNull().default("assigned"),
    notes: text("notes"),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Custody-overdue reminder (roadmap 7.6). Stamped once when the daily sweep
    // first finds an assignment still out past its expectedReturnDate, so the
    // holder is reminded exactly once (claim-on-null). Returning the item moves
    // it off "assigned", removing it from the candidate set.
    overdueNotifiedAt: timestamp("overdue_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("equipment_assignments_company_id_idx").on(table.companyId),
    index("equipment_assignments_user_id_idx").on(table.userId),
    index("equipment_assignments_status_idx").on(table.status),
  ]
)

export const equipmentAssignmentsRelations = relations(equipmentAssignments, ({ one }) => ({
  company: one(companies, { fields: [equipmentAssignments.companyId], references: [companies.id] }),
  user: one(users, { fields: [equipmentAssignments.userId], references: [users.id] }),
}))

export type EquipmentCondition = (typeof equipmentConditionEnum.enumValues)[number]
export type EquipmentAssignmentStatus = (typeof equipmentAssignmentStatusEnum.enumValues)[number]
