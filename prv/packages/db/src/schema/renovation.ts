import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  numeric,
  integer,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { companies } from "./companies"
import { users } from "./users"
import { clients } from "./clients"
import { projects } from "./projects"

// ─── Enums ───────────────────────────────────────────────────────────────────

export const renovationProjectStatusEnum = pgEnum("renovation_project_status", [
  "inquiry",
  "estimation",
  "contracted",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
])

export const renovationProjectTypeEnum = pgEnum("renovation_project_type", [
  "residential",
  "commercial",
  "industrial",
  "public",
])

export const renovationProjectPriorityEnum = pgEnum("renovation_project_priority", [
  "low",
  "medium",
  "high",
  "urgent",
])

export const renovationPhaseStatusEnum = pgEnum("renovation_phase_status", [
  "pending",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
])

export const renovationTaskStatusEnum = pgEnum("renovation_task_status", [
  "todo",
  "in_progress",
  "blocked",
  "review",
  "done",
])

export const renovationTaskTypeEnum = pgEnum("renovation_task_type", [
  "labor",
  "inspection",
  "delivery",
  "procurement",
  "approval",
])

export const renovationTaskPriorityEnum = pgEnum("renovation_task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
])

export const renovationEstimateStatusEnum = pgEnum("renovation_estimate_status", [
  "draft",
  "sent_to_client",
  "accepted",
  "rejected",
  "superseded",
])

export const renovationContractStatusEnum = pgEnum("renovation_contract_status", [
  "draft",
  "sent",
  "signed",
  "active",
  "completed",
  "terminated",
])

export const renovationSiteReportTypeEnum = pgEnum("renovation_site_report_type", [
  "daily",
  "incident",
  "inspection",
  "milestone",
])

export const renovationMaterialRequestStatusEnum = pgEnum("renovation_material_request_status", [
  "pending",
  "approved",
  "ordered",
  "delivered",
  "cancelled",
])

export const renovationEstimateLineCategoryEnum = pgEnum("renovation_estimate_line_category", [
  "labor",
  "materials",
  "subcontractors",
  "equipment",
  "overhead",
])

// ─── Tables ──────────────────────────────────────────────────────────────────

export const renovationProjects = pgTable(
  "renovation_projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    // Bridge to the generic project used by the client portal (Phase 23.6), so
    // renovation site-report photos and progress surface on the portal project.
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),

    projectCode: varchar("project_code", { length: 50 }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: renovationProjectStatusEnum("status").notNull().default("inquiry"),
    priority: renovationProjectPriorityEnum("priority").notNull().default("medium"),
    projectType: renovationProjectTypeEnum("project_type").notNull().default("residential"),

    address: text("address"),
    city: varchar("city", { length: 100 }),
    coordinates: jsonb("coordinates"),

    estimatedStartDate: date("estimated_start_date"),
    estimatedEndDate: date("estimated_end_date"),
    actualStartDate: date("actual_start_date"),
    actualEndDate: date("actual_end_date"),

    estimatedValue: numeric("estimated_value", { precision: 14, scale: 2 }),
    contractedValue: numeric("contracted_value", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    projectManagerId: uuid("project_manager_id").references(() => users.id, {
      onDelete: "set null",
    }),
    siteSupervisorId: uuid("site_supervisor_id").references(() => users.id, {
      onDelete: "set null",
    }),

    completionPercentage: integer("completion_percentage").notNull().default(0),
    approvalInstanceId: uuid("approval_instance_id"),

    tags: jsonb("tags").notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("renovation_projects_company_id_idx").on(table.companyId),
    index("renovation_projects_client_id_idx").on(table.clientId),
    index("renovation_projects_project_id_idx").on(table.projectId),
    index("renovation_projects_status_idx").on(table.status),
    index("renovation_projects_manager_id_idx").on(table.projectManagerId),
  ]
)

export const renovationPhases = pgTable(
  "renovation_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => renovationProjects.id, { onDelete: "cascade" }),

    phaseNumber: integer("phase_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: renovationPhaseStatusEnum("status").notNull().default("pending"),

    plannedStartDate: date("planned_start_date"),
    plannedEndDate: date("planned_end_date"),
    actualStartDate: date("actual_start_date"),
    actualEndDate: date("actual_end_date"),

    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 }),
    actualCost: numeric("actual_cost", { precision: 14, scale: 2 }),

    completionPercentage: integer("completion_percentage").notNull().default(0),
    requiresClientApproval: boolean("requires_client_approval").notNull().default(false),
    approvalInstanceId: uuid("approval_instance_id"),
    supervisorId: uuid("supervisor_id").references(() => users.id, { onDelete: "set null" }),

    lexorank: varchar("lexorank", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("renovation_phases_project_id_idx").on(table.projectId),
    index("renovation_phases_status_idx").on(table.status),
  ]
)

export const renovationTasks = pgTable(
  "renovation_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => renovationProjects.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id").references(() => renovationPhases.id, { onDelete: "set null" }),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    taskType: renovationTaskTypeEnum("task_type").notNull().default("labor"),
    status: renovationTaskStatusEnum("status").notNull().default("todo"),
    priority: renovationTaskPriorityEnum("priority").notNull().default("medium"),

    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
    actualHours: numeric("actual_hours", { precision: 8, scale: 2 }),

    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => users.id, { onDelete: "set null" }),

    blockedReason: text("blocked_reason"),
    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("renovation_tasks_project_id_idx").on(table.projectId),
    index("renovation_tasks_phase_id_idx").on(table.phaseId),
    index("renovation_tasks_assigned_to_idx").on(table.assignedTo),
    index("renovation_tasks_status_idx").on(table.status),
  ]
)

export const renovationEstimates = pgTable(
  "renovation_estimates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => renovationProjects.id, { onDelete: "cascade" }),

    estimateNumber: varchar("estimate_number", { length: 50 }).notNull(),
    version: integer("version").notNull().default(1),
    status: renovationEstimateStatusEnum("status").notNull().default("draft"),

    validUntil: date("valid_until"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("19"),
    vatAmount: numeric("vat_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    notes: text("notes"),
    preparedBy: uuid("prepared_by").references(() => users.id, { onDelete: "set null" }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),

    clientViewedAt: timestamp("client_viewed_at", { withTimezone: true }),
    clientResponse: text("client_response"),
    pdfDocumentId: uuid("pdf_document_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("renovation_estimates_project_id_idx").on(table.projectId),
    index("renovation_estimates_status_idx").on(table.status),
  ]
)

export const renovationEstimateLines = pgTable(
  "renovation_estimate_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    estimateId: uuid("estimate_id")
      .notNull()
      .references(() => renovationEstimates.id, { onDelete: "cascade" }),

    lineNumber: integer("line_number").notNull(),
    category: renovationEstimateLineCategoryEnum("category").notNull().default("labor"),
    description: text("description").notNull(),
    unit: varchar("unit", { length: 50 }),
    quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull().default("0"),
    supplierId: uuid("supplier_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("renovation_estimate_lines_estimate_id_idx").on(table.estimateId)]
)

export const renovationContracts = pgTable(
  "renovation_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => renovationProjects.id, { onDelete: "cascade" }),
    estimateId: uuid("estimate_id").references(() => renovationEstimates.id, {
      onDelete: "set null",
    }),

    contractNumber: varchar("contract_number", { length: 50 }).notNull(),
    status: renovationContractStatusEnum("status").notNull().default("draft"),
    contractValue: numeric("contract_value", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("RON"),

    startDate: date("start_date"),
    endDate: date("end_date"),

    signedByClientAt: timestamp("signed_by_client_at", { withTimezone: true }),
    signedByCompanyAt: timestamp("signed_by_company_at", { withTimezone: true }),
    terminationDate: date("termination_date"),
    terminationReason: text("termination_reason"),

    paymentTerms: jsonb("payment_terms").notNull().default({}),
    documentId: uuid("document_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("renovation_contracts_project_id_idx").on(table.projectId),
    index("renovation_contracts_status_idx").on(table.status),
  ]
)

export const renovationSiteReports = pgTable(
  "renovation_site_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => renovationProjects.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id").references(() => renovationPhases.id, { onDelete: "set null" }),

    reportDate: date("report_date").notNull(),
    reportType: renovationSiteReportTypeEnum("report_type").notNull().default("daily"),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    weatherConditions: varchar("weather_conditions", { length: 100 }),
    workersOnSite: integer("workers_on_site").notNull().default(0),
    workPerformed: text("work_performed"),
    issuesEncountered: text("issues_encountered"),
    materialsUsed: jsonb("materials_used").notNull().default([]),
    completionDelta: integer("completion_delta").notNull().default(0),
    photos: jsonb("photos").notNull().default([]),
    clientVisible: boolean("client_visible").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("renovation_site_reports_project_id_idx").on(table.projectId),
    index("renovation_site_reports_date_idx").on(table.reportDate),
  ]
)

export const renovationMaterialRequests = pgTable(
  "renovation_material_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => renovationProjects.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id").references(() => renovationPhases.id, { onDelete: "set null" }),

    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: renovationMaterialRequestStatusEnum("status").notNull().default("pending"),
    neededByDate: date("needed_by_date"),
    approvalInstanceId: uuid("approval_instance_id"),
    purchaseOrderId: uuid("purchase_order_id"),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("renovation_material_requests_project_id_idx").on(table.projectId),
    index("renovation_material_requests_status_idx").on(table.status),
  ]
)

export const renovationMaterialRequestLines = pgTable(
  "renovation_material_request_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => renovationMaterialRequests.id, { onDelete: "cascade" }),

    description: text("description").notNull(),
    unit: varchar("unit", { length: 50 }),
    quantityRequested: numeric("quantity_requested", { precision: 12, scale: 4 }).notNull(),
    quantityApproved: numeric("quantity_approved", { precision: 12, scale: 4 }),
    estimatedUnitPrice: numeric("estimated_unit_price", { precision: 14, scale: 2 }),
    supplierId: uuid("supplier_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("renovation_material_request_lines_request_id_idx").on(table.requestId)]
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const renovationProjectsRelations = relations(renovationProjects, ({ one, many }) => ({
  company: one(companies, {
    fields: [renovationProjects.companyId],
    references: [companies.id],
  }),
  client: one(clients, {
    fields: [renovationProjects.clientId],
    references: [clients.id],
  }),
  projectManager: one(users, {
    fields: [renovationProjects.projectManagerId],
    references: [users.id],
    relationName: "renovation_project_manager",
  }),
  siteSupervisor: one(users, {
    fields: [renovationProjects.siteSupervisorId],
    references: [users.id],
    relationName: "renovation_site_supervisor",
  }),
  phases: many(renovationPhases),
  tasks: many(renovationTasks),
  estimates: many(renovationEstimates),
  contracts: many(renovationContracts),
  siteReports: many(renovationSiteReports),
  materialRequests: many(renovationMaterialRequests),
}))

export const renovationPhasesRelations = relations(renovationPhases, ({ one, many }) => ({
  project: one(renovationProjects, {
    fields: [renovationPhases.projectId],
    references: [renovationProjects.id],
  }),
  supervisor: one(users, {
    fields: [renovationPhases.supervisorId],
    references: [users.id],
  }),
  tasks: many(renovationTasks),
  siteReports: many(renovationSiteReports),
  materialRequests: many(renovationMaterialRequests),
}))

export const renovationTasksRelations = relations(renovationTasks, ({ one }) => ({
  project: one(renovationProjects, {
    fields: [renovationTasks.projectId],
    references: [renovationProjects.id],
  }),
  phase: one(renovationPhases, {
    fields: [renovationTasks.phaseId],
    references: [renovationPhases.id],
  }),
  assignee: one(users, {
    fields: [renovationTasks.assignedTo],
    references: [users.id],
    relationName: "renovation_task_assignee",
  }),
  completedByUser: one(users, {
    fields: [renovationTasks.completedBy],
    references: [users.id],
    relationName: "renovation_task_completed_by",
  }),
}))

export const renovationEstimatesRelations = relations(renovationEstimates, ({ one, many }) => ({
  project: one(renovationProjects, {
    fields: [renovationEstimates.projectId],
    references: [renovationProjects.id],
  }),
  preparedByUser: one(users, {
    fields: [renovationEstimates.preparedBy],
    references: [users.id],
    relationName: "renovation_estimate_preparer",
  }),
  approvedByUser: one(users, {
    fields: [renovationEstimates.approvedBy],
    references: [users.id],
    relationName: "renovation_estimate_approver",
  }),
  lines: many(renovationEstimateLines),
}))

export const renovationEstimateLinesRelations = relations(renovationEstimateLines, ({ one }) => ({
  estimate: one(renovationEstimates, {
    fields: [renovationEstimateLines.estimateId],
    references: [renovationEstimates.id],
  }),
}))

export const renovationContractsRelations = relations(renovationContracts, ({ one }) => ({
  project: one(renovationProjects, {
    fields: [renovationContracts.projectId],
    references: [renovationProjects.id],
  }),
  estimate: one(renovationEstimates, {
    fields: [renovationContracts.estimateId],
    references: [renovationEstimates.id],
  }),
}))

export const renovationSiteReportsRelations = relations(renovationSiteReports, ({ one }) => ({
  project: one(renovationProjects, {
    fields: [renovationSiteReports.projectId],
    references: [renovationProjects.id],
  }),
  phase: one(renovationPhases, {
    fields: [renovationSiteReports.phaseId],
    references: [renovationPhases.id],
  }),
  submittedByUser: one(users, {
    fields: [renovationSiteReports.submittedBy],
    references: [users.id],
  }),
}))

export const renovationMaterialRequestsRelations = relations(
  renovationMaterialRequests,
  ({ one, many }) => ({
    project: one(renovationProjects, {
      fields: [renovationMaterialRequests.projectId],
      references: [renovationProjects.id],
    }),
    phase: one(renovationPhases, {
      fields: [renovationMaterialRequests.phaseId],
      references: [renovationPhases.id],
    }),
    requestedByUser: one(users, {
      fields: [renovationMaterialRequests.requestedBy],
      references: [users.id],
    }),
    lines: many(renovationMaterialRequestLines),
  })
)

export const renovationMaterialRequestLinesRelations = relations(
  renovationMaterialRequestLines,
  ({ one }) => ({
    request: one(renovationMaterialRequests, {
      fields: [renovationMaterialRequestLines.requestId],
      references: [renovationMaterialRequests.id],
    }),
  })
)
