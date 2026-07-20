import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  real,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { projects } from "./projects"

export const incidentSeverityEnum = pgEnum("incident_severity", [
  "low",
  "medium",
  "high",
  "critical",
])

export const incidentStatusEnum = pgEnum("incident_status", [
  "open",
  "under_investigation",
  "resolved",
  "closed",
])

export const incidentTypeEnum = pgEnum("incident_type", [
  "accident",
  "near_miss",
  "hazard",
  "property_damage",
  "environmental",
  "security",
])

export const inspectionStatusEnum = pgEnum("inspection_status", [
  "scheduled",
  "in_progress",
  "completed",
  "overdue",
])

export const safetyIncidents = pgTable(
  "safety_incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    reportedBy: uuid("reported_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description").notNull(),
    type: incidentTypeEnum("type").notNull(),
    severity: incidentSeverityEnum("severity").notNull(),
    status: incidentStatusEnum("status").notNull().default("open"),
    location: varchar("location", { length: 300 }),
    incidentAt: timestamp("incident_at", { withTimezone: true }).notNull(),
    injuriesCount: integer("injuries_count").notNull().default(0),
    rootCause: text("root_cause"),
    correctiveActions: text("corrective_actions"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("safety_incidents_company_id_idx").on(t.companyId),
    index("safety_incidents_project_id_idx").on(t.projectId),
    index("safety_incidents_status_idx").on(t.status),
    index("safety_incidents_severity_idx").on(t.severity),
    index("safety_incidents_incident_at_idx").on(t.incidentAt),
  ]
)

export const safetyInspections = pgTable(
  "safety_inspections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    status: inspectionStatusEnum("status").notNull().default("scheduled"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    nextDueDate: timestamp("next_due_date", { withTimezone: true }),
    score: real("score"),
    maxScore: real("max_score"),
    notes: text("notes"),
    recurrenceWeeks: integer("recurrence_weeks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("safety_inspections_company_id_idx").on(t.companyId),
    index("safety_inspections_project_id_idx").on(t.projectId),
    index("safety_inspections_status_idx").on(t.status),
    index("safety_inspections_scheduled_at_idx").on(t.scheduledAt),
    index("safety_inspections_next_due_date_idx").on(t.nextDueDate),
  ]
)

export const safetyBriefings = pgTable(
  "safety_briefings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 300 }).notNull(),
    content: text("content").notNull(),
    category: varchar("category", { length: 100 }).default("general"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    nextScheduledDate: timestamp("next_scheduled_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    attendeeCount: integer("attendee_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("safety_briefings_company_id_idx").on(t.companyId),
    index("safety_briefings_scheduled_at_idx").on(t.scheduledAt),
    index("safety_briefings_is_active_idx").on(t.isActive),
  ]
)

export const safetyTrainingRecords = pgTable(
  "safety_training_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    trainingName: varchar("training_name", { length: 300 }).notNull(),
    provider: varchar("provider", { length: 200 }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    certificateUrl: varchar("certificate_url", { length: 500 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("safety_training_records_company_id_idx").on(t.companyId),
    index("safety_training_records_user_id_idx").on(t.userId),
    index("safety_training_records_expires_at_idx").on(t.expiresAt),
  ]
)

export const safetyBriefingAttendees = pgTable(
  "safety_briefing_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefingId: uuid("briefing_id")
      .notNull()
      .references(() => safetyBriefings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("safety_briefing_attendees_briefing_id_idx").on(t.briefingId),
    index("safety_briefing_attendees_user_id_idx").on(t.userId),
  ]
)

export const safetyIncidentsRelations = relations(safetyIncidents, ({ one }) => ({
  company: one(companies, { fields: [safetyIncidents.companyId], references: [companies.id] }),
  project: one(projects, { fields: [safetyIncidents.projectId], references: [projects.id] }),
  reporter: one(users, {
    fields: [safetyIncidents.reportedBy],
    references: [users.id],
    relationName: "reported_incidents",
  }),
  assignee: one(users, {
    fields: [safetyIncidents.assignedTo],
    references: [users.id],
    relationName: "assigned_incidents",
  }),
}))

export const safetyInspectionsRelations = relations(safetyInspections, ({ one }) => ({
  company: one(companies, { fields: [safetyInspections.companyId], references: [companies.id] }),
  project: one(projects, { fields: [safetyInspections.projectId], references: [projects.id] }),
  assignee: one(users, {
    fields: [safetyInspections.assignedTo],
    references: [users.id],
    relationName: "assigned_inspections",
  }),
  creator: one(users, {
    fields: [safetyInspections.createdBy],
    references: [users.id],
    relationName: "created_inspections",
  }),
}))

export const safetyBriefingsRelations = relations(safetyBriefings, ({ one, many }) => ({
  company: one(companies, { fields: [safetyBriefings.companyId], references: [companies.id] }),
  creator: one(users, { fields: [safetyBriefings.createdBy], references: [users.id] }),
  attendees: many(safetyBriefingAttendees),
}))

export const safetyBriefingAttendeesRelations = relations(safetyBriefingAttendees, ({ one }) => ({
  briefing: one(safetyBriefings, {
    fields: [safetyBriefingAttendees.briefingId],
    references: [safetyBriefings.id],
  }),
  user: one(users, { fields: [safetyBriefingAttendees.userId], references: [users.id] }),
}))

export const safetyTrainingRecordsRelations = relations(safetyTrainingRecords, ({ one }) => ({
  company: one(companies, {
    fields: [safetyTrainingRecords.companyId],
    references: [companies.id],
  }),
  user: one(users, { fields: [safetyTrainingRecords.userId], references: [users.id] }),
}))

// Phase 18.2 — Inspection checklists.
// inspection_templates: reusable checklists (jsonb item list). inspection_item_results:
// the executed answers for one inspection, from which its score is computed and, on a
// failed item, a corrective task may be spawned.
export const inspectionTemplates = pgTable(
  "inspection_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    items: jsonb("items")
      .$type<{ label: string; weight: number; requirePhoto: boolean; critical: boolean }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inspection_templates_company_id_idx").on(t.companyId)]
)

export const inspectionItemResults = pgTable(
  "inspection_item_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => safetyInspections.id, { onDelete: "cascade" }),
    itemIndex: integer("item_index").notNull(),
    label: varchar("label", { length: 500 }).notNull(),
    weight: integer("weight").notNull().default(1),
    critical: boolean("critical").notNull().default(false),
    result: varchar("result", { length: 8 }).notNull(), // pass | fail | na
    note: text("note"),
    photoUrl: text("photo_url"),
    correctiveTaskId: uuid("corrective_task_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inspection_item_results_inspection_id_idx").on(t.inspectionId),
    index("inspection_item_results_company_id_idx").on(t.companyId),
  ]
)

export const inspectionTemplatesRelations = relations(inspectionTemplates, ({ one }) => ({
  company: one(companies, { fields: [inspectionTemplates.companyId], references: [companies.id] }),
}))

export const inspectionItemResultsRelations = relations(inspectionItemResults, ({ one }) => ({
  inspection: one(safetyInspections, {
    fields: [inspectionItemResults.inspectionId],
    references: [safetyInspections.id],
  }),
}))

export type InspectionTemplate = typeof inspectionTemplates.$inferSelect
export type InspectionItemResult = typeof inspectionItemResults.$inferSelect

// Phase 18.3 — Permit-to-Work.
// An 8-state permit with a two-stage approval (supervisor → safety officer)
// modelled directly on the row (paired approver/decision stamps). Ordering and
// authorization are enforced in the pure lib apps/web/src/lib/ptw.ts.
export const permitTypeEnum = pgEnum("permit_type", [
  "hot_work",
  "confined_space",
  "working_at_height",
  "electrical",
  "excavation",
])

export const permitStatusEnum = pgEnum("permit_status", [
  "draft",
  "pending_supervisor",
  "pending_safety_officer",
  "approved",
  "active",
  "closed",
  "rejected",
  "expired",
  "suspended",
  "revoked",
])

export const safetyPermits = pgTable(
  "safety_permits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    supervisorId: uuid("supervisor_id").references(() => users.id, { onDelete: "set null" }),
    safetyOfficerId: uuid("safety_officer_id").references(() => users.id, { onDelete: "set null" }),

    type: permitTypeEnum("type").notNull(),
    status: permitStatusEnum("status").notNull().default("draft"),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description").notNull(),
    location: varchar("location", { length: 300 }),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }).notNull(),

    riskAssessment: jsonb("risk_assessment")
      .$type<{ hazard: string; control: string; residualRisk: "low" | "medium" | "high" }[]>()
      .notNull()
      .default([]),
    ppe: jsonb("ppe").$type<string[]>().notNull().default([]),
    typeDetails: jsonb("type_details").$type<Record<string, unknown>>().notNull().default({}),

    supervisorApprovedBy: uuid("supervisor_approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    supervisorApprovedAt: timestamp("supervisor_approved_at", { withTimezone: true }),
    safetyOfficerApprovedBy: uuid("safety_officer_approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    safetyOfficerApprovedAt: timestamp("safety_officer_approved_at", { withTimezone: true }),
    rejectedBy: uuid("rejected_by").references(() => users.id, { onDelete: "set null" }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    activatedBy: uuid("activated_by").references(() => users.id, { onDelete: "set null" }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closeOutNotes: text("close_out_notes"),
    suspendedBy: uuid("suspended_by").references(() => users.id, { onDelete: "set null" }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),
    reinstatedBy: uuid("reinstated_by").references(() => users.id, { onDelete: "set null" }),
    reinstatedAt: timestamp("reinstated_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("safety_permits_company_id_idx").on(t.companyId),
    index("safety_permits_project_id_idx").on(t.projectId),
    index("safety_permits_status_idx").on(t.status),
    index("safety_permits_type_idx").on(t.type),
    index("safety_permits_valid_to_idx").on(t.validTo),
    index("safety_permits_requested_by_idx").on(t.requestedBy),
  ]
)

export const safetyPermitsRelations = relations(safetyPermits, ({ one }) => ({
  company: one(companies, { fields: [safetyPermits.companyId], references: [companies.id] }),
  project: one(projects, { fields: [safetyPermits.projectId], references: [projects.id] }),
  requester: one(users, { fields: [safetyPermits.requestedBy], references: [users.id] }),
}))

export type SafetyPermit = typeof safetyPermits.$inferSelect
