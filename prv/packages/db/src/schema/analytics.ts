import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core"

// ─── Analytics Events ─────────────────────────────────────────────────────────
// Central event bus — every module action emits an event here.
// Partitioning by month is handled at the DB level; Drizzle sees one logical table.

export const analyticsModuleEnum = pgEnum("analytics_module", [
  "auth",
  "projects",
  "renovation",
  "finance",
  "workforce",
  "attendance",
  "crm",
  "shop",
  "documents",
  "knowledge",
  "learning",
  "communications",
  "fleet",
  "tools",
  "procurement",
  "approvals",
  "notifications",
  "intelligence",
  "system",
])

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    actorId: uuid("actor_id"),
    module: analyticsModuleEnum("module").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(), // e.g. 'invoice.paid'
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    properties: jsonb("properties").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("analytics_events_company_id_idx").on(t.companyId),
    index("analytics_events_created_at_idx").on(t.createdAt),
    index("analytics_events_module_idx").on(t.module),
    index("analytics_events_event_type_idx").on(t.eventType),
  ]
)

// ─── KPI Daily Snapshots ──────────────────────────────────────────────────────
// Nightly point-in-time capture of all 6 KPI domains per company.
// Used for trend charts and historical comparison without re-querying live tables.

export const kpiDailySnapshots = pgTable(
  "kpi_daily_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),

    // Date this snapshot represents (YYYY-MM-DD)
    snapshotDate: varchar("snapshot_date", { length: 10 }).notNull(),

    // Domain 1 — Revenue
    revenueMonth: numeric("revenue_month", { precision: 14, scale: 2 }).notNull().default("0"),
    revenueYtd: numeric("revenue_ytd", { precision: 14, scale: 2 }).notNull().default("0"),
    invoiceCount: integer("invoice_count").notNull().default(0),
    overdueAmount: numeric("overdue_amount", { precision: 14, scale: 2 }).notNull().default("0"),

    // Domain 2 — Operations
    activeProjects: integer("active_projects").notNull().default(0),
    totalTasks: integer("total_tasks").notNull().default(0),
    doneTasks: integer("done_tasks").notNull().default(0),

    // Domain 3 — Workforce
    headcount: integer("headcount").notNull().default(0),
    presentToday: integer("present_today").notNull().default(0),
    pendingLeave: integer("pending_leave").notNull().default(0),

    // Domain 4 — Financial
    expensesMonth: numeric("expenses_month", { precision: 14, scale: 2 }).notNull().default("0"),
    grossProfit: numeric("gross_profit", { precision: 14, scale: 2 }).notNull().default("0"),

    // Domain 5 — CRM
    activeLeads: integer("active_leads").notNull().default(0),
    pipelineValue: numeric("pipeline_value", { precision: 14, scale: 2 }).notNull().default("0"),
    activeClients: integer("active_clients").notNull().default(0),

    // Domain 6 — Shop
    shopOrders: integer("shop_orders").notNull().default(0),
    shopRevenue: numeric("shop_revenue", { precision: 14, scale: 2 }).notNull().default("0"),

    // Composite health score (0-100)
    healthScore: integer("health_score").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("kpi_daily_snapshots_company_date_idx").on(t.companyId, t.snapshotDate),
    index("kpi_daily_snapshots_company_id_idx").on(t.companyId),
  ]
)

// ─── Alert System (Command Center Phase 16 foundation) ───────────────────────

export const alertSeverityEnum = pgEnum("alert_severity", [
  "l1_info",
  "l2_warning",
  "l3_critical",
  "l4_emergency",
  "l5_crisis",
])

export const alertStatusEnum = pgEnum("alert_status", [
  "open",
  "acknowledged",
  "assigned",
  "resolved",
])

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    severity: alertSeverityEnum("severity").notNull().default("l1_info"),
    status: alertStatusEnum("status").notNull().default("open"),
    title: text("title").notNull(),
    description: text("description"),
    source: varchar("source", { length: 100 }).notNull().default("system"),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    assignedToId: uuid("assigned_to_id"),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alerts_company_id_idx").on(t.companyId),
    index("alerts_status_idx").on(t.status),
    index("alerts_severity_idx").on(t.severity),
    index("alerts_created_at_idx").on(t.createdAt),
  ]
)
