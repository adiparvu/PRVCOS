import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  numeric,
  varchar,
  unique,
  customType,
} from "drizzle-orm/pg-core"

export const insightTypeEnum = pgEnum("insight_type", [
  "recommendation",
  "alert",
  "forecast",
  "report",
])
export const insightPriorityEnum = pgEnum("insight_priority", ["urgent", "medium", "low"])
export const insightStatusEnum = pgEnum("insight_status", [
  "new",
  "reviewed",
  "actioned",
  "dismissed",
])
export const reportTypeEnum = pgEnum("report_type", [
  "monthly",
  "inventory",
  "forecast",
  "performance",
])
export const reportStatusEnum = pgEnum("report_status", ["ready", "pending", "scheduled"])
export const anomalyTypeEnum = pgEnum("anomaly_type", ["risk", "spike", "opportunity"])
export const anomalySeverityEnum = pgEnum("anomaly_severity", ["high", "medium", "low"])
export const statusDotEnum = pgEnum("status_dot", ["red", "amber", "green"])
export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"])

// AI-generated insights, recommendations, alerts and forecasts
export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  type: insightTypeEnum("type").notNull(),
  priority: insightPriorityEnum("priority").notNull().default("medium"),
  status: insightStatusEnum("status").notNull().default("new"),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  affectedCount: integer("affected_count").notNull().default(0),
  affectedLabel: text("affected_label").notNull().default(""),
  confidenceLabel: text("confidence_label").notNull().default(""),
  score: integer("score").notNull().default(0),
  riskLabel: text("risk_label").notNull().default(""),
  riskDeadline: text("risk_deadline").notNull().default(""),
  dataSource: text("data_source").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

// Stores linked to an insight (for detail view)
export const insightAffectedStores = pgTable("insight_affected_stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  insightId: uuid("insight_id")
    .notNull()
    .references(() => aiInsights.id, { onDelete: "cascade" }),
  storeId: uuid("store_id"),
  storeName: text("store_name").notNull(),
  statusDot: statusDotEnum("status_dot").notNull().default("amber"),
  metricLabel: text("metric_label").notNull().default(""),
  metricValue: text("metric_value").notNull().default(""),
  detail: text("detail").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
})

// Action recommendations within an insight
export const insightRecommendations = pgTable("insight_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  insightId: uuid("insight_id")
    .notNull()
    .references(() => aiInsights.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  priority: insightPriorityEnum("priority").notNull().default("medium"),
  deadline: text("deadline").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
})

// PDF/AI generated reports (monthly, inventory, forecast, performance)
export const generatedReports = pgTable("generated_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  title: text("title").notNull(),
  type: reportTypeEnum("type").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  pages: integer("pages").notNull().default(0),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

// AI-detected anomalies surfaced in the intelligence feed
export const anomalyDetections = pgTable("anomaly_detections", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  type: anomalyTypeEnum("type").notNull(),
  severity: anomalySeverityEnum("severity").notNull(),
  domain: text("domain").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  metric: text("metric").notNull().default(""),
  actionLabel: text("action_label").notNull().default(""),
  href: text("href").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
})

// Monthly revenue actuals + AI forecast values
export const revenueForecastSeries = pgTable(
  "revenue_forecast_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull(),
    monthLabel: varchar("month_label", { length: 10 }).notNull(),
    year: integer("year").notNull(),
    monthIndex: integer("month_index").notNull(),
    actualAmount: numeric("actual_amount", { precision: 14, scale: 2 }),
    forecastAmount: numeric("forecast_amount", { precision: 14, scale: 2 }),
    lowerBound: numeric("lower_bound", { precision: 14, scale: 2 }),
    upperBound: numeric("upper_bound", { precision: 14, scale: 2 }),
    confidencePct: integer("confidence_pct"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("revenue_forecast_series_company_year_month_unique").on(
      t.companyId,
      t.year,
      t.monthIndex
    ),
  ]
)

// Per-domain risk levels for the current forecast period
export const forecastRiskItems = pgTable("forecast_risk_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  domain: text("domain").notNull(),
  level: riskLevelEnum("level").notNull(),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Actionable opportunities surfaced by the forecast engine
export const forecastOpportunities = pgTable("forecast_opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  title: text("title").notNull(),
  valueLabel: text("value_label").notNull(),
  href: text("href").notNull().default(""),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── AI Conversation History ────────────────────────────────────────────────────

export const aiMessageRoleEnum = pgEnum("ai_message_role", ["user", "assistant"])

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  companyId: uuid("company_id").notNull(),
  title: varchar("title", { length: 200 }).notNull().default("New conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  role: aiMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── Document Embeddings (pgvector — requires: CREATE EXTENSION IF NOT EXISTS vector) ──

const vectorColumn = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)"
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(",").map(Number)
  },
})

export const embeddingSourceEnum = pgEnum("embedding_source", [
  "knowledge_article",
  "project",
  "document",
  "insight",
])

export const documentEmbeddings = pgTable("document_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull(),
  sourceType: embeddingSourceEnum("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  content: text("content").notNull(),
  embedding: vectorColumn("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
