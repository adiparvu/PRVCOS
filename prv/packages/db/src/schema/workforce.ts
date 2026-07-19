import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies, stores } from "./companies"
import { users } from "./users"
import { projects } from "./projects"

// ─── Leave Requests ──────────────────────────────────────────────────────────

export const leaveTypeEnum = pgEnum("leave_type", ["annual", "medical", "unpaid", "other"])

export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"])

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    type: leaveTypeEnum("type").notNull().default("annual"),
    status: leaveStatusEnum("status").notNull().default("pending"),

    startDate: varchar("start_date", { length: 10 }).notNull(),
    endDate: varchar("end_date", { length: 10 }).notNull(),
    label: varchar("label", { length: 255 }),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("leave_requests_company_id_idx").on(table.companyId),
    index("leave_requests_user_id_idx").on(table.userId),
  ]
)

// ─── Team Availability ───────────────────────────────────────────────────────
// Manual scheduling-availability overrides per member per day. The schedule
// grid derives a baseline from shifts + approved leave; rows here record a
// manager's explicit override for a specific date, which wins over the baseline.

export const availabilityStateEnum = pgEnum("availability_state", ["yes", "maybe", "no"])

export const teamAvailability = pgTable(
  "team_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    setByUserId: uuid("set_by_user_id").references(() => users.id, { onDelete: "set null" }),

    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    state: availabilityStateEnum("state").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("team_availability_company_id_idx").on(table.companyId),
    index("team_availability_user_id_idx").on(table.userId),
    unique("team_availability_user_date_unique").on(table.companyId, table.userId, table.date),
  ]
)

// ─── Attendance Records ──────────────────────────────────────────────────────

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "absent",
  "leave",
  "clocked_out",
])

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    leaveRequestId: uuid("leave_request_id").references(() => leaveRequests.id, {
      onDelete: "set null",
    }),

    date: varchar("date", { length: 10 }).notNull(),
    status: attendanceStatusEnum("status").notNull().default("absent"),

    scheduledStart: varchar("scheduled_start", { length: 5 }).notNull().default("08:00"),
    scheduledEnd: varchar("scheduled_end", { length: 5 }).notNull().default("17:00"),

    clockIn: timestamp("clock_in", { withTimezone: true }),
    clockOut: timestamp("clock_out", { withTimezone: true }),
    lateMinutes: integer("late_minutes"),
    gpsVerified: boolean("gps_verified").notNull().default(false),
    locationLat: numeric("location_lat", { precision: 9, scale: 6 }),
    locationLng: numeric("location_lng", { precision: 9, scale: 6 }),
    locationAccuracyM: integer("location_accuracy_m"),
    clockInMethod: varchar("clock_in_method", { length: 20 }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("attendance_records_company_id_idx").on(table.companyId),
    index("attendance_records_user_id_idx").on(table.userId),
    index("attendance_records_date_idx").on(table.date),
    unique("attendance_records_user_date_unique").on(table.userId, table.date),
  ]
)

// ─── Shifts ──────────────────────────────────────────────────────────────────

export const shiftRoleEnum = pgEnum("shift_role", [
  "foreman",
  "bricklayer",
  "electrician",
  "finisher",
  "welder",
  "general",
])

export const shiftStatusEnum = pgEnum("shift_status", [
  "confirmed",
  "open",
  "draft",
  "scheduled",
  "cancelled",
])

export const shifts = pgTable(
  "shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),

    role: shiftRoleEnum("role").notNull().default("general"),
    roleLabel: varchar("role_label", { length: 100 }),
    title: varchar("title", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),

    date: varchar("date", { length: 10 }).notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    durationHours: numeric("duration_hours", { precision: 4, scale: 1 }).notNull().default("8"),

    status: shiftStatusEnum("status").notNull().default("draft"),
    totalSlots: integer("total_slots").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("shifts_company_id_idx").on(table.companyId),
    index("shifts_date_idx").on(table.date),
  ]
)

export const shiftAssignments = pgTable(
  "shift_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shiftId: uuid("shift_id")
      .notNull()
      .references(() => shifts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("shift_assignments_shift_user_unique").on(table.shiftId, table.userId),
    index("shift_assignments_shift_id_idx").on(table.shiftId),
    index("shift_assignments_user_id_idx").on(table.userId),
  ]
)

// ─── Payroll Runs ────────────────────────────────────────────────────────────

export const payrollRunStatusEnum = pgEnum("payroll_run_status", ["processing", "done", "pending"])

export const payrollRunTypeEnum = pgEnum("payroll_run_type", ["weekly", "monthly", "special"])

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    ref: varchar("ref", { length: 20 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    periodStart: varchar("period_start", { length: 10 }).notNull(),
    periodEnd: varchar("period_end", { length: 10 }).notNull(),

    employeeCount: integer("employee_count").notNull().default(0),
    totalGross: numeric("total_gross", { precision: 12, scale: 2 }).notNull().default("0"),
    netPaid: numeric("net_paid", { precision: 12, scale: 2 }).notNull().default("0"),

    status: payrollRunStatusEnum("status").notNull().default("pending"),
    type: payrollRunTypeEnum("type").notNull().default("weekly"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payroll_runs_company_id_idx").on(table.companyId),
    unique("payroll_runs_company_ref_unique").on(table.companyId, table.ref),
  ]
)

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const taskPriorityEnum = pgEnum("task_priority", ["urgent", "medium", "low"])

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"])

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, { onDelete: "set null" }),

    title: varchar("title", { length: 500 }).notNull(),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    status: taskStatusEnum("status").notNull().default("todo"),
    isAllStores: boolean("is_all_stores").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_company_id_idx").on(table.companyId),
    index("tasks_status_idx").on(table.status),
  ]
)

// ─── Relations ───────────────────────────────────────────────────────────────

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  company: one(companies, { fields: [leaveRequests.companyId], references: [companies.id] }),
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  approvedBy: one(users, {
    fields: [leaveRequests.approvedByUserId],
    references: [users.id],
    relationName: "leaveApprover",
  }),
}))

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  company: one(companies, { fields: [attendanceRecords.companyId], references: [companies.id] }),
  user: one(users, { fields: [attendanceRecords.userId], references: [users.id] }),
  store: one(stores, { fields: [attendanceRecords.storeId], references: [stores.id] }),
  leaveRequest: one(leaveRequests, {
    fields: [attendanceRecords.leaveRequestId],
    references: [leaveRequests.id],
  }),
}))

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  company: one(companies, { fields: [shifts.companyId], references: [companies.id] }),
  store: one(stores, { fields: [shifts.storeId], references: [stores.id] }),
  project: one(projects, { fields: [shifts.projectId], references: [projects.id] }),
  assignments: many(shiftAssignments),
}))

export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one }) => ({
  shift: one(shifts, { fields: [shiftAssignments.shiftId], references: [shifts.id] }),
  user: one(users, { fields: [shiftAssignments.userId], references: [users.id] }),
  company: one(companies, { fields: [shiftAssignments.companyId], references: [companies.id] }),
}))

export const payrollRunsRelations = relations(payrollRuns, ({ one }) => ({
  company: one(companies, { fields: [payrollRuns.companyId], references: [companies.id] }),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  company: one(companies, { fields: [tasks.companyId], references: [companies.id] }),
  store: one(stores, { fields: [tasks.storeId], references: [stores.id] }),
  assignee: one(users, { fields: [tasks.assigneeUserId], references: [users.id] }),
}))

// ─── Leave Balances (roadmap 7.3) ────────────────────────────────────────────
// One row per (user, leave type, year). Tracks the annual entitlement, any days
// carried over from the prior year, an optional monthly accrual rate, and the
// running used / pending tallies. Available = entitlement + carriedOver − used
// − pending (see lib/leave-balance.ts). Company-scoped.

export const leaveBalances = pgTable(
  "leave_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: leaveTypeEnum("type").notNull().default("annual"),
    year: integer("year").notNull(),
    entitlementDays: numeric("entitlement_days", { precision: 6, scale: 2 }).notNull().default("0"),
    carriedOverDays: numeric("carried_over_days", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    accrualDaysPerMonth: numeric("accrual_days_per_month", { precision: 5, scale: 2 }),
    usedDays: numeric("used_days", { precision: 6, scale: 2 }).notNull().default("0"),
    pendingDays: numeric("pending_days", { precision: 6, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("leave_balances_user_type_year_unique").on(table.userId, table.type, table.year),
    index("leave_balances_company_id_idx").on(table.companyId),
    index("leave_balances_user_id_idx").on(table.userId),
  ]
)

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  company: one(companies, { fields: [leaveBalances.companyId], references: [companies.id] }),
  user: one(users, { fields: [leaveBalances.userId], references: [users.id] }),
}))
