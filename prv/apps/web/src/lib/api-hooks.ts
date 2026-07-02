"use client"

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { InvoiceSummary } from "@/app/api/finance/invoices/route"
import type { Expense, FinanceMeta, PlRow } from "@/app/api/finance/expenses/route"
import type { QuoteSummary } from "@/app/api/crm/quotes/route"
import type { ClientSummary } from "@/app/api/crm/clients/route"
import type { Lead } from "@/app/api/crm/leads/route"
import type { ProjectSummary } from "@/app/api/projects/route"
import type { PayrollRun, PayrollMeta } from "@/app/api/payroll/route"
import type { POSummary, ProcurementMeta } from "@/app/api/procurement/route"
import type { DocumentRecord, DocumentsMeta } from "@/app/api/documents/route"
import type { TimeOffRequest } from "@/app/api/people/time-off/route"
import type { ApprovalSummary, ApprovalsMeta } from "@/app/api/approvals/route"
import type { AttendanceRecord, AttendanceMeta } from "@/app/api/attendance/route"
import type { VehicleSummary, FleetMeta } from "@/app/api/fleet/route"
import type { VehicleDetail } from "@/app/api/fleet/[id]/route"
import type { PODetail } from "@/app/api/procurement/[id]/route"
import type { ToolDetail } from "@/app/api/tools/[id]/route"
import type { ApprovalDetail } from "@/app/api/approvals/[id]/route"
import type { ClientDetail } from "@/app/api/crm/clients/[id]/route"
import type { SupplierDetail } from "@/app/api/suppliers/[id]/route"
import type { ShiftDetail } from "@/app/api/schedule/[id]/route"
import type { AttendanceDetail } from "@/app/api/attendance/[id]/route"
import type { QuoteDetail } from "@/app/api/crm/quotes/[id]/route"
import type { InvoiceDetail } from "@/app/api/finance/invoices/[id]/route"
import type { KnowledgeArticle, KnowledgeMeta } from "@/app/api/knowledge/route"
import type { Course, Achievement, LearningMeta } from "@/app/api/learning/route"
import type { ShiftSummary, ShiftsMeta, TeamAvailability } from "@/app/api/schedule/route"
import type { SupplierSummary } from "@/app/api/suppliers/route"
import type { ToolSummary, ToolsMeta } from "@/app/api/tools/route"
import type { OperationsMeta, Store, Task, Order, Alert } from "@/app/api/operations/route"
import type { Insight, Report, StoreKpi, IntelligenceMeta } from "@/app/api/intelligence/route"
import type { FinanceReport } from "@/app/api/finance/reports/route"
import type { ProjectAllocation } from "@/app/api/projects/[id]/allocations/route"
import type { WorkloadRow, WorkloadSummary } from "@/app/api/resources/workload/route"
import type { BudgetLine, BudgetResponse } from "@/app/api/projects/[id]/budget/route"
import type { TaskSummary } from "@/app/api/projects/[id]/tasks/route"
import type { RiskSummary, RiskRegisterMeta } from "@/app/api/projects/[id]/risks/route"
import type { ActivityEntry } from "@/app/api/projects/[id]/activity/route"
import type { LeaveBalanceSummary } from "@/app/api/workforce/leave/balances/route"
import type { EquipmentAssignment, EquipmentMeta } from "@/app/api/workforce/equipment/route"
import type { PerformanceRow, PerformanceSummary } from "@/app/api/workforce/performance/route"
import type { Holiday } from "@/app/api/workforce/holidays/route"
import type { ContractSummary, ContractMeta } from "@/app/api/contracts/route"
import type { ComplianceDoc, ComplianceMeta } from "@/app/api/compliance/documents/route"
import type { PayrollItem, PayrollItemsTotals } from "@/app/api/payroll/[id]/items/route"
import type { RequisitionSummary, RequisitionMeta } from "@/app/api/recruitment/requisitions/route"
import type { Candidate } from "@/app/api/recruitment/candidates/route"

const LIMIT = 50

function buildUrl(base: string, params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "" && v !== "all" && v !== "All" && v !== "Everyone" && v !== "Recent") {
      sp.set(k, v)
    }
  }
  sp.set("limit", String(LIMIT))
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

// ── Invoices ──────────────────────────────────────────────────────────────────

interface InvoicesPage {
  invoices: InvoiceSummary[]
  nextCursor: string | null
}

export function useInvoices(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["invoices", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/finance/invoices", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<InvoicesPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      invoices: data.pages.flatMap((p) => p.invoices),
    }),
  })
}

// ── Expenses ──────────────────────────────────────────────────────────────────

interface ExpensesPage {
  expenses: Expense[]
  meta: FinanceMeta
  plData: PlRow[]
  nextCursor: string | null
}

export function useExpenses(status?: string | null, category?: string | null) {
  return useInfiniteQuery({
    queryKey: ["expenses", status ?? "all", category ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/finance/expenses", { status, category, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<ExpensesPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      expenses: data.pages.flatMap((p) => p.expenses),
      meta: data.pages[0]?.meta ?? null,
      plData: data.pages[0]?.plData ?? [],
    }),
  })
}

// ── Finance Reports ───────────────────────────────────────────────────────────

export function useFinanceReports() {
  return useQuery({
    queryKey: ["financeReports"],
    queryFn: () =>
      fetch("/api/finance/reports").then((r) => r.json() as Promise<{ reports: FinanceReport[] }>),
  })
}

// ── Quotes ────────────────────────────────────────────────────────────────────

interface QuotesPage {
  quotes: QuoteSummary[]
  nextCursor: string | null
}

export function useQuotes(status?: string | null, clientId?: string | null) {
  return useInfiniteQuery({
    queryKey: ["quotes", status ?? "all", clientId ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/crm/quotes", { status, clientId, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<QuotesPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      quotes: data.pages.flatMap((p) => p.quotes),
    }),
  })
}

// ── Clients ───────────────────────────────────────────────────────────────────

interface ClientsPage {
  clients: ClientSummary[]
  nextCursor: string | null
}

export function useClients(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["clients", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/crm/clients", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<ClientsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      clients: data.pages.flatMap((p) => p.clients),
    }),
  })
}

// ── Leads ─────────────────────────────────────────────────────────────────────

interface LeadsPage {
  leads: Lead[]
  pipeline: Record<string, Lead[]>
  nextCursor: string | null
}

export function useLeads() {
  return useInfiniteQuery({
    queryKey: ["leads"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/crm/leads", { cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<LeadsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      leads: data.pages.flatMap((p) => p.leads),
    }),
  })
}

// ── Projects ──────────────────────────────────────────────────────────────────

interface ProjectsPage {
  projects: ProjectSummary[]
  nextCursor: string | null
}

export function useProjects(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["projects", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/projects", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<ProjectsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      projects: data.pages.flatMap((p) => p.projects),
    }),
  })
}

// ── Payroll ───────────────────────────────────────────────────────────────────

interface PayrollPage {
  runs: PayrollRun[]
  meta: PayrollMeta
  nextCursor: string | null
}

export function usePayrollRuns(type?: string | null) {
  return useInfiniteQuery({
    queryKey: ["payroll", type ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/payroll", { type, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<PayrollPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      runs: data.pages.flatMap((p) => p.runs),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Procurement ───────────────────────────────────────────────────────────────

interface ProcurementPage {
  orders: POSummary[]
  meta: ProcurementMeta
  nextCursor: string | null
}

export function usePurchaseOrders(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["procurement", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/procurement", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<ProcurementPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      orders: data.pages.flatMap((p) => p.orders),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Documents ─────────────────────────────────────────────────────────────────

interface DocumentsPage {
  documents: DocumentRecord[]
  meta: DocumentsMeta
  nextCursor: string | null
}

export function useDocuments(category?: string | null) {
  return useInfiniteQuery({
    queryKey: ["documents", category ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/documents", { category, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<DocumentsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      documents: data.pages.flatMap((p) => p.documents),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Time-off ──────────────────────────────────────────────────────────────────

// ── People directory ──────────────────────────────────────────────────────────

interface PeopleMember {
  id: string
  fullName: string
  jobTitle: string | null
  managerId: string | null
  presence: { status: string; statusMessage: string | null; lastSeenAt: string | null }
}

interface PeoplePage {
  members: PeopleMember[]
  count: number
  nextCursor: string | null
}

export function usePeople(search?: string) {
  return useInfiniteQuery({
    queryKey: ["people", search ?? ""],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/people", {
          search: search ?? null,
          cursor: pageParam as string | null,
          limit: "100",
        })
      ).then((r) => r.json() as Promise<PeoplePage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      members: data.pages.flatMap((p) => p.members),
    }),
  })
}

interface TimeOffPage {
  requests: TimeOffRequest[]
  nextCursor: string | null
}

export function useTimeOffRequests(status = "pending") {
  return useInfiniteQuery({
    queryKey: ["time-off", status],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/people/time-off", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<TimeOffPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      requests: data.pages.flatMap((p) => p.requests),
    }),
  })
}

// ── Approvals ─────────────────────────────────────────────────────────────────

interface ApprovalsPage {
  approvals: ApprovalSummary[]
  meta: ApprovalsMeta
  nextCursor: string | null
}

export function useApprovals(type?: string | null) {
  return useInfiniteQuery({
    queryKey: ["approvals", type ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/approvals", { type, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<ApprovalsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      approvals: data.pages.flatMap((p) => p.approvals),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Attendance ────────────────────────────────────────────────────────────────

interface AttendancePage {
  records: AttendanceRecord[]
  meta: AttendanceMeta
  nextCursor: string | null
}

export function useAttendanceRecords(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["attendance", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/attendance", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<AttendancePage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      records: data.pages.flatMap((p) => p.records),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Fleet ─────────────────────────────────────────────────────────────────────

interface FleetPage {
  vehicles: VehicleSummary[]
  meta: FleetMeta
  nextCursor: string | null
}

export function useVehicles(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["fleet", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/fleet", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<FleetPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      vehicles: data.pages.flatMap((p) => p.vehicles),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

export function useVehicleDetail(id: string) {
  return useQuery({
    queryKey: ["vehicle-detail", id],
    queryFn: () =>
      fetch(`/api/fleet/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load vehicle")
        return r.json() as Promise<{ vehicle: VehicleDetail }>
      }),
    enabled: !!id,
  })
}

// ── Knowledge ─────────────────────────────────────────────────────────────────

interface KnowledgePage {
  articles: KnowledgeArticle[]
  meta: KnowledgeMeta
  nextCursor: string | null
}

export function useKnowledgeArticles(category?: string | null) {
  return useInfiniteQuery({
    queryKey: ["knowledge", category ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/knowledge", { category, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<KnowledgePage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      articles: data.pages.flatMap((p) => p.articles),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Learning ──────────────────────────────────────────────────────────────────

interface LearningPage {
  courses: Course[]
  meta: LearningMeta
  achievements: Achievement[]
  nextCursor: string | null
}

export function useCourses(category?: string | null) {
  return useInfiniteQuery({
    queryKey: ["learning", category ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/learning", { category, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<LearningPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      courses: data.pages.flatMap((p) => p.courses),
      meta: data.pages[0]?.meta ?? null,
      achievements: data.pages[0]?.achievements ?? [],
    }),
  })
}

// ── Schedule ──────────────────────────────────────────────────────────────────

interface ShiftsPage {
  shifts: ShiftSummary[]
  meta: ShiftsMeta
  nextCursor: string | null
  teamAvailability?: TeamAvailability
  takenSlots?: string[]
}

export function useShifts(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["schedule", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/schedule", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<ShiftsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      shifts: data.pages.flatMap((p) => p.shifts),
      meta: data.pages[0]?.meta ?? null,
      teamAvailability: data.pages[0]?.teamAvailability ?? null,
      takenSlots: data.pages[0]?.takenSlots ?? [],
    }),
  })
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

interface SuppliersPage {
  suppliers: SupplierSummary[]
  nextCursor: string | null
}

export function useSuppliers(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["suppliers", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/suppliers", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<SuppliersPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      suppliers: data.pages.flatMap((p) => p.suppliers),
    }),
  })
}

// ── Tools ─────────────────────────────────────────────────────────────────────

interface ToolsPage {
  tools: ToolSummary[]
  meta: ToolsMeta
  nextCursor: string | null
}

export function useTools(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["tools", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/tools", { status, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<ToolsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      tools: data.pages.flatMap((p) => p.tools),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Operations ────────────────────────────────────────────────────────────────

interface OperationsData {
  stores: Store[]
  tasks: Task[]
  orders: Order[]
  meta: OperationsMeta
  alerts: Alert[]
}

export function useOperationsData() {
  return useQuery({
    queryKey: ["operations"],
    queryFn: () => fetch("/api/operations").then((r) => r.json() as Promise<OperationsData>),
  })
}

// ── Intelligence ──────────────────────────────────────────────────────────────

interface IntelligenceData {
  insights: Insight[]
  reports: Report[]
  storeKpis: StoreKpi[]
  meta: IntelligenceMeta
}

export function useIntelligence(type?: string | null, priority?: string | null) {
  return useQuery({
    queryKey: ["intelligence", type ?? "all", priority ?? "all"],
    queryFn: () =>
      fetch(buildUrl("/api/intelligence", { type, priority })).then(
        (r) => r.json() as Promise<IntelligenceData>
      ),
  })
}

export interface ForecastMetric {
  label: string
  value: string
  trend: string
  trendDir: "up" | "down" | "flat"
  pct: number
}

export function useForecastMetrics() {
  return useQuery({
    queryKey: ["intelligence-forecast-metrics"],
    queryFn: () =>
      fetch("/api/intelligence/forecast-metrics").then(
        (r) => r.json() as Promise<{ metrics: ForecastMetric[] }>
      ),
  })
}

export interface AnalyticsChart {
  labels: string[]
  actual: number[]
  forecast: number[]
}

export interface DonutDatum {
  label: string
  value: number
}

export interface AnalyticsMetrics {
  chart: Record<string, AnalyticsChart>
  spark: { revenue: number[]; avgOrder: number[]; orders: number[]; alerts: number[] }
  donut: DonutDatum[]
  donutTotalLabel: string
}

export function useAnalyticsMetrics() {
  return useQuery({
    queryKey: ["intelligence-analytics-metrics"],
    queryFn: () =>
      fetch("/api/intelligence/analytics-metrics").then(
        (r) => r.json() as Promise<AnalyticsMetrics>
      ),
  })
}

// ── Roles ─────────────────────────────────────────────────────────────────────

interface RoleItem {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  defaultScopeLevel: string
  isActive: boolean
}

interface RolesResponse {
  roles: RoleItem[]
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => fetch("/api/roles").then((r) => r.json() as Promise<RolesResponse>),
    select: (data) => data.roles,
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  isDismissed: boolean
  createdAt: string
  [key: string]: unknown
}

interface NotificationsPage {
  items: NotificationItem[]
  nextCursor: string | null
  hasMore: boolean
  counts: { unread: number; total: number }
}

export function useNotifications(filter?: string | null) {
  return useInfiniteQuery({
    queryKey: ["notifications", filter ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(buildUrl("/api/notifications", { filter, cursor: pageParam as string | null })).then(
        (r) => r.json() as Promise<NotificationsPage>
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      notifications: data.pages.flatMap((p) => p.items),
      counts: data.pages[0]?.counts ?? { unread: 0, total: 0 },
    }),
  })
}

// ── Renovation Projects ───────────────────────────────────────────────────────

export interface RenovationProjectSummary {
  id: string
  projectCode: string | null
  title: string
  status: string
  priority: string
  projectType: string
  estimatedValue: number | null
  contractedValue: number | null
  currency: string
  completionPercentage: number
  estimatedStartDate: string | null
  estimatedEndDate: string | null
  city: string | null
  clientId: string | null
  clientName: string | null
  projectManagerId: string | null
  projectManagerName: string | null
  createdAt: string
}

interface RenovationProjectsPage {
  projects: RenovationProjectSummary[]
  count: number
  nextCursor: string | null
}

export function useRenovationProjects(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["renovation-projects", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/renovation/projects", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<RenovationProjectsPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      projects: data.pages.flatMap((p) => p.projects),
    }),
  })
}

export function useRenovationProject(id: string) {
  return useQuery({
    queryKey: ["renovation-project", id],
    queryFn: () =>
      fetch(`/api/renovation/projects/${id}`).then(
        (r) => r.json() as Promise<{ project: unknown }>
      ),
    enabled: !!id,
  })
}

export function useRenovationPhases(projectId: string) {
  return useQuery({
    queryKey: ["renovation-phases", projectId],
    queryFn: () =>
      fetch(`/api/renovation/projects/${projectId}/phases`).then(
        (r) => r.json() as Promise<{ phases: unknown[] }>
      ),
    enabled: !!projectId,
  })
}

export function useRenovationTasks(projectId: string, status?: string | null) {
  return useQuery({
    queryKey: ["renovation-tasks", projectId, status ?? "all"],
    queryFn: () =>
      fetch(buildUrl(`/api/renovation/projects/${projectId}/tasks`, { status })).then(
        (r) => r.json() as Promise<{ tasks: unknown[] }>
      ),
    enabled: !!projectId,
  })
}

export function useRenovationEstimates(projectId: string) {
  return useQuery({
    queryKey: ["renovation-estimates", projectId],
    queryFn: () =>
      fetch(`/api/renovation/projects/${projectId}/estimates?lines=true`).then(
        (r) => r.json() as Promise<{ estimates: unknown[] }>
      ),
    enabled: !!projectId,
  })
}

export function useRenovationContracts(projectId: string) {
  return useQuery({
    queryKey: ["renovation-contracts", projectId],
    queryFn: () =>
      fetch(`/api/renovation/projects/${projectId}/contracts`).then(
        (r) => r.json() as Promise<{ contracts: unknown[] }>
      ),
    enabled: !!projectId,
  })
}

export function useRenovationSiteReports(projectId: string) {
  return useInfiniteQuery({
    queryKey: ["renovation-site-reports", projectId],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl(`/api/renovation/projects/${projectId}/site-reports`, {
          cursor: pageParam as string | null,
        })
      ).then((r) => r.json() as Promise<{ reports: unknown[]; nextCursor: string | null }>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    enabled: !!projectId,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      reports: data.pages.flatMap((p) => p.reports),
    }),
  })
}

// ── Purchase Requests ─────────────────────────────────────────────────────────

export interface PurchaseRequest {
  id: string
  ref: string
  itemDescription: string
  category: string
  quantity: number
  unit: string
  estimatedCost: number
  currency: string
  urgency: "standard" | "urgent" | "emergency"
  department: string | null
  justification: string | null
  status: "draft" | "submitted" | "approved" | "rejected" | "converted"
  requestedByName: string
  approvedByName: string | null
  createdAt: string
  purchaseOrderId: string | null
}

export interface PRMeta {
  totalCount: number
  submittedCount: number
  approvedCount: number
  pendingValue: number
}

export interface SupplierScorecard {
  supplierId: string
  supplierName: string
  onTimeRate: number
  totalSpend: number
  totalOrders: number
  avgLeadTimeDays: number | null
  qualityRejectionRate: number
  grade: string
  currency: string
}

interface PurchaseRequestsPage {
  requests: PurchaseRequest[]
  count: number
  nextCursor: string | null
  meta: PRMeta
}

export function usePurchaseRequests(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["purchase-requests", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/procurement/requests", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<PurchaseRequestsPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      requests: data.pages.flatMap((p) => p.requests),
      meta: data.pages[0]?.meta ?? null,
      count: data.pages[0]?.count ?? 0,
    }),
  })
}

export function useSupplierScorecard(supplierId: string | null) {
  return useQuery({
    queryKey: ["supplier-scorecard", supplierId],
    queryFn: () =>
      fetch(`/api/suppliers/${supplierId}/scorecard`).then(
        (r) => r.json() as Promise<SupplierScorecard>
      ),
    enabled: !!supplierId,
  })
}

// ── Safety ────────────────────────────────────────────────────────────────────

export function useSafetyDashboard() {
  return useQuery({
    queryKey: ["safety-dashboard"],
    queryFn: () => fetch("/api/safety").then((r) => r.json()),
    staleTime: 30_000,
  })
}

interface IncidentsPage {
  incidents: unknown[]
  meta: unknown
  nextCursor: string | null
}

export function useIncidents(status?: string | null, severity?: string | null) {
  return useInfiniteQuery({
    queryKey: ["safety-incidents", status ?? "all", severity ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/safety/incidents", {
          status,
          severity,
          cursor: pageParam as string | null,
        })
      ).then((r) => r.json() as Promise<IncidentsPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      incidents: data.pages.flatMap((p) => p.incidents),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

interface InspectionsPage {
  inspections: unknown[]
  meta: unknown
  nextCursor: string | null
}

export function useInspections(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["safety-inspections", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/safety/inspections", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<InspectionsPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      inspections: data.pages.flatMap((p) => p.inspections),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

interface BriefingsPage {
  briefings: unknown[]
  meta: unknown
  nextCursor: string | null
}

export function useBriefings(isActive?: boolean | null) {
  return useInfiniteQuery({
    queryKey: ["safety-briefings", isActive ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/safety/briefings", {
          isActive: isActive != null ? String(isActive) : null,
          cursor: pageParam as string | null,
        })
      ).then((r) => r.json() as Promise<BriefingsPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      briefings: data.pages.flatMap((p) => p.briefings),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

export function useIncidentDetail(id: string | null) {
  return useQuery({
    queryKey: ["safety-incident-detail", id],
    queryFn: () => fetch(`/api/safety/incidents/${id}`).then((r) => r.json()),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useInspectionDetail(id: string | null) {
  return useQuery({
    queryKey: ["safety-inspection-detail", id],
    queryFn: () => fetch(`/api/safety/inspections/${id}`).then((r) => r.json()),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useBriefingDetail(id: string | null) {
  return useQuery({
    queryKey: ["safety-briefing-detail", id],
    queryFn: () => fetch(`/api/safety/briefings/${id}`).then((r) => r.json()),
    enabled: !!id,
    staleTime: 30_000,
  })
}

interface TrainingPage {
  records: unknown[]
  meta: unknown
  nextCursor: string | null
}

export function useTrainingRecords(userId?: string | null, expiringSoon?: boolean | null) {
  return useInfiniteQuery({
    queryKey: ["safety-training", userId ?? "all", expiringSoon ?? false],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/safety/training", {
          userId: userId ?? null,
          expiringSoon: expiringSoon ? "true" : null,
          cursor: pageParam as string | null,
        })
      ).then((r) => r.json() as Promise<TrainingPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      records: data.pages.flatMap((p) => p.records),
      meta: data.pages[0]?.meta ?? null,
    }),
  })
}

// ── Detail queries ────────────────────────────────────────────────────────────

export function usePurchaseOrderDetail(id: string) {
  return useQuery({
    queryKey: ["purchase-order-detail", id],
    queryFn: () =>
      fetch(`/api/procurement/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load purchase order")
        return r.json() as Promise<{ order: PODetail }>
      }),
    enabled: !!id,
  })
}

export function useToolDetail(id: string) {
  return useQuery({
    queryKey: ["tool-detail", id],
    queryFn: () =>
      fetch(`/api/tools/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load tool")
        return r.json() as Promise<{ tool: ToolDetail }>
      }),
    enabled: !!id,
  })
}

export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: ["approval-detail", id],
    queryFn: () =>
      fetch(`/api/approvals/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to load approval")
        return r.json() as Promise<{ approval: ApprovalDetail }>
      }),
    enabled: !!id,
  })
}

export function useClientDetail(id: string) {
  return useQuery({
    queryKey: ["client-detail", id],
    queryFn: () =>
      fetch(`/api/crm/clients/${id}`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("Failed to load client")
        return r.json() as Promise<{ client: ClientDetail }>
      }),
    enabled: !!id,
  })
}

export function useSupplierDetail(id: string) {
  return useQuery({
    queryKey: ["supplier-detail", id],
    queryFn: () =>
      fetch(`/api/suppliers/${id}`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("Failed to load supplier")
        return r.json() as Promise<{ supplier: SupplierDetail }>
      }),
    enabled: !!id,
  })
}

export function useShiftDetail(id: string) {
  return useQuery({
    queryKey: ["shift-detail", id],
    queryFn: () =>
      fetch(`/api/schedule/${id}`).then((r) => r.json() as Promise<{ shift: ShiftDetail | null }>),
    enabled: !!id,
  })
}

export function useAttendanceDetail(id: string) {
  return useQuery({
    queryKey: ["attendance-detail", id],
    queryFn: () =>
      fetch(`/api/attendance/${id}`).then(
        (r) => r.json() as Promise<{ record: AttendanceDetail | null }>
      ),
    enabled: !!id,
  })
}

export function useQuoteDetail(id: string) {
  return useQuery({
    queryKey: ["quote-detail", id],
    queryFn: () =>
      fetch(`/api/crm/quotes/${id}`).then(
        (r) => r.json() as Promise<{ quote: QuoteDetail | null }>
      ),
    enabled: !!id,
  })
}

export function useInvoiceDetail(id: string) {
  return useQuery({
    queryKey: ["invoice-detail", id],
    queryFn: () =>
      fetch(`/api/finance/invoices/${id}`).then(
        (r) => r.json() as Promise<{ invoice: InvoiceDetail | null }>
      ),
    enabled: !!id,
  })
}

// ── Group Rollup ──────────────────────────────────────────────────────────────

export interface GroupSummary {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  isActive: boolean
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () =>
      fetch("/api/groups").then((r) => r.json() as Promise<{ groups: GroupSummary[] }>),
  })
}

export interface GroupRollupRow {
  companyId: string
  name: string
  revenue: number
  share: number
  activeProjects: number
  headcount: number
}

export interface GroupRollup {
  group: { id: string; name: string }
  period: string
  kpis: {
    totalRevenue: string
    totalActiveProjects: number
    totalActiveEmployees: number
    totalOpenAlerts: number
    companiesIncluded: number
    periodKey: string
  }
  trend: { labels: string[]; revenue: number[] }
  breakdown: GroupRollupRow[]
}

export function useGroupRollup(groupId: string | null, period = "qtd") {
  return useQuery({
    queryKey: ["group-rollup", groupId, period],
    enabled: !!groupId,
    queryFn: () =>
      fetch(`/api/groups/${groupId}/rollup?period=${period}`).then(
        (r) => r.json() as Promise<GroupRollup>
      ),
  })
}

export interface GroupMember {
  companyId: string
  companyName: string
  isActive: boolean
  joinedAt: string
}

export interface GroupDetail {
  group: {
    id: string
    name: string
    slug: string
    description: string | null
    logoUrl: string | null
  }
  members: GroupMember[]
  eligibleCompanies: { id: string; name: string }[]
}

export function useGroupDetail(groupId: string | null) {
  return useQuery({
    queryKey: ["group-detail", groupId],
    enabled: !!groupId,
    queryFn: () => fetch(`/api/groups/${groupId}`).then((r) => r.json() as Promise<GroupDetail>),
  })
}

// ── Universal Calendar ────────────────────────────────────────────────────────

export type CalendarModule = "projects" | "shifts" | "finance" | "leave"

export interface CalendarEvent {
  id: string
  date: string
  module: CalendarModule
  title: string
  subtitle: string
  time: string
}

export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["calendar", from, to],
    enabled: !!from && !!to,
    queryFn: () =>
      fetch(`/api/calendar?from=${from}&to=${to}`).then(
        (r) => r.json() as Promise<{ events: CalendarEvent[]; range: { from: string; to: string } }>
      ),
  })
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface Favorite {
  id: string
  entityType: string
  entityId: string
  label: string
  href: string
  createdAt: string
}

export interface FavoriteTarget {
  entityType: string
  entityId: string
  label: string
  href: string
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () =>
      fetch("/api/favorites").then((r) => r.json() as Promise<{ favorites: Favorite[] }>),
    staleTime: 30_000,
  })
}

/**
 * Toggle a favorite on/off. `favorited` is the CURRENT state — when true we
 * DELETE, otherwise we POST. Invalidates the favorites cache on settle so the
 * command palette and any favorite buttons re-sync.
 */
export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ target, favorited }: { target: FavoriteTarget; favorited: boolean }) => {
      if (favorited) {
        const qs = new URLSearchParams({
          entityType: target.entityType,
          entityId: target.entityId,
        })
        const res = await fetch(`/api/favorites?${qs.toString()}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to remove favorite")
        return { favorited: false }
      }
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      })
      if (!res.ok) throw new Error("Failed to add favorite")
      return { favorited: true }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

// ── Project Resources & Allocations (6.3) ──────────────────────────────────────

export type { ProjectAllocation, WorkloadRow, WorkloadSummary }

export interface AllocationInput {
  userId: string
  allocationPercentage: number
  roleLabel?: string | null
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
}

export function useProjectAllocations(projectId: string | null) {
  return useQuery({
    queryKey: ["project-allocations", projectId],
    enabled: !!projectId,
    queryFn: () =>
      fetch(`/api/projects/${projectId}/allocations`).then(
        (r) => r.json() as Promise<{ allocations: ProjectAllocation[] }>
      ),
  })
}

export function useWorkload() {
  return useQuery({
    queryKey: ["resources-workload"],
    queryFn: () =>
      fetch("/api/resources/workload").then(
        (r) => r.json() as Promise<{ people: WorkloadRow[]; summary: WorkloadSummary }>
      ),
    staleTime: 30_000,
  })
}

// Assign/update an allocation. Invalidates both the project's allocation list
// and the company workload board so utilization stays in sync.
export function useUpsertAllocation(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AllocationInput) => {
      const res = await fetch(`/api/projects/${projectId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to save allocation")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["project-allocations", projectId] })
      void qc.invalidateQueries({ queryKey: ["resources-workload"] })
    },
  })
}

export function useDeleteAllocation(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (allocationId: string) => {
      const res = await fetch(`/api/projects/${projectId}/allocations/${allocationId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove allocation")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["project-allocations", projectId] })
      void qc.invalidateQueries({ queryKey: ["resources-workload"] })
    },
  })
}

// ── Project Budgets & Earned Value Analysis (6.4) ──────────────────────────────

export type { BudgetLine, BudgetResponse }

export type BudgetCategory = "labor" | "materials" | "equipment" | "overhead" | "contingency"

export interface BudgetLineInput {
  category: BudgetCategory
  plannedAmount?: number
  committedAmount?: number
  actualAmount?: number
  notes?: string | null
}

export function useProjectBudget(projectId: string | null) {
  return useQuery({
    queryKey: ["project-budget", projectId],
    enabled: !!projectId,
    queryFn: () =>
      fetch(`/api/projects/${projectId}/budget`).then((r) => r.json() as Promise<BudgetResponse>),
  })
}

export function useUpsertBudgetLine(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: BudgetLineInput) => {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to save budget line")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["project-budget", projectId] })
    },
  })
}

export function useDeleteBudgetLine(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (category: BudgetCategory) => {
      const res = await fetch(
        `/api/projects/${projectId}/budget?category=${encodeURIComponent(category)}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to remove budget line")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["project-budget", projectId] })
    },
  })
}

// ── Project Tasks / Kanban (6.2) ───────────────────────────────────────────────

export type { TaskSummary }

export type ProjectTaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled"

export interface CreateTaskInput {
  title: string
  description?: string | null
  status?: ProjectTaskStatus
  priority?: "low" | "medium" | "high" | "critical"
  assigneeId?: string | null
  dueDate?: string | null
  estimatedHours?: number | null
  parentTaskId?: string | null
  dependsOnTaskId?: string | null
  orderIndex?: number
}

export interface UpdateTaskInput {
  taskId: string
  patch: Partial<{
    title: string
    description: string | null
    status: ProjectTaskStatus
    priority: "low" | "medium" | "high" | "critical"
    assigneeId: string | null
    dueDate: string | null
    estimatedHours: number | null
    actualHours: number | null
    dependsOnTaskId: string | null
    orderIndex: number
  }>
}

export function useProjectTasks(projectId: string | null, status?: string | null) {
  return useQuery({
    queryKey: ["project-tasks", projectId, status ?? "all"],
    enabled: !!projectId,
    queryFn: () =>
      fetch(buildUrl(`/api/projects/${projectId}/tasks`, { status })).then(
        (r) => r.json() as Promise<{ tasks: TaskSummary[] }>
      ),
  })
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to create task")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  })
}

// Returns a typed error carrying the "TASK_BLOCKED" code so the board can
// surface a dependency conflict rather than a generic failure.
export function useUpdateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, patch }: UpdateTaskInput) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { code?: string; error?: string }
        const err = new Error(body.error ?? "Failed to update task") as Error & { code?: string }
        err.code = body.code
        throw err
      }
      return res.json() as Promise<{ id: string; status: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  })
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete task")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  })
}

// ── Project Risk Register (6.6) ────────────────────────────────────────────────

export type { RiskSummary, RiskRegisterMeta }

export type RiskCategory =
  | "schedule"
  | "cost"
  | "quality"
  | "safety"
  | "resource"
  | "external"
  | "other"
export type RiskStatus = "open" | "mitigating" | "monitoring" | "closed" | "accepted"

export interface CreateRiskInput {
  title: string
  description?: string | null
  category?: RiskCategory
  impact: number
  probability: number
  mitigation?: string | null
  status?: RiskStatus
  ownerId?: string | null
  dueDate?: string | null
}

export function useProjectRisks(projectId: string | null) {
  return useQuery({
    queryKey: ["project-risks", projectId],
    enabled: !!projectId,
    queryFn: () =>
      fetch(`/api/projects/${projectId}/risks`).then(
        (r) => r.json() as Promise<{ risks: RiskSummary[]; meta: RiskRegisterMeta }>
      ),
  })
}

export function useCreateRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRiskInput) => {
      const res = await fetch(`/api/projects/${projectId}/risks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to log risk")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["project-risks", projectId] }),
  })
}

export function useUpdateRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ riskId, patch }: { riskId: string; patch: Partial<CreateRiskInput> }) => {
      const res = await fetch(`/api/projects/${projectId}/risks/${riskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Failed to update risk")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["project-risks", projectId] }),
  })
}

export function useDeleteRisk(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (riskId: string) => {
      const res = await fetch(`/api/projects/${projectId}/risks/${riskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete risk")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["project-risks", projectId] }),
  })
}

// ── Project Activity Log (6.7) ─────────────────────────────────────────────────

export type { ActivityEntry }

interface ActivityPage {
  entries: ActivityEntry[]
  nextCursor: string | null
}

export function useProjectActivity(projectId: string | null) {
  return useInfiniteQuery({
    queryKey: ["project-activity", projectId],
    enabled: !!projectId,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetch(
        buildUrl(`/api/projects/${projectId}/activity`, { before: pageParam ?? undefined })
      ).then((r) => r.json() as Promise<ActivityPage>),
    getNextPageParam: (last) => last.nextCursor,
  })
}

export function usePostProjectComment(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (comment: string) => {
      const res = await fetch(`/api/projects/${projectId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      })
      if (!res.ok) throw new Error("Failed to post comment")
      return res.json() as Promise<{ ok: boolean }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["project-activity", projectId] }),
  })
}

// ── Project Health Score (6.1) ─────────────────────────────────────────────────

export type ProjectHealthBand = "healthy" | "at_risk" | "critical"

export interface ProjectHealth {
  score: number
  band: ProjectHealthBand
  breakdown: { budget: number; progress: number; risk: number }
  inputs: {
    taskCompletion: number
    totalTasks: number
    doneTasks: number
    budgetBand: "green" | "amber" | "red" | null
    openCriticalRisks: number
    openHighRisks: number
    scheduleFraction: number
  }
}

export function useProjectHealth(projectId: string | null) {
  return useQuery({
    queryKey: ["project-health", projectId],
    enabled: !!projectId,
    queryFn: () =>
      fetch(`/api/projects/${projectId}/health`).then((r) => r.json() as Promise<ProjectHealth>),
    staleTime: 60_000,
  })
}

// ── Leave Balances (7.3) ───────────────────────────────────────────────────────

export type { LeaveBalanceSummary }

export interface LeaveBalanceInput {
  userId: string
  type: "annual" | "medical" | "unpaid" | "other"
  year: number
  entitlementDays: number
  carriedOverDays?: number
  accrualDaysPerMonth?: number | null
}

export function useLeaveBalances(userId?: string | null, year?: number | null) {
  return useQuery({
    queryKey: ["leave-balances", userId ?? "self", year ?? "current"],
    queryFn: () =>
      fetch(
        buildUrl("/api/workforce/leave/balances", { userId, year: year ? String(year) : undefined })
      ).then((r) => r.json() as Promise<{ balances: LeaveBalanceSummary[]; year: number }>),
  })
}

export function useUpsertLeaveBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: LeaveBalanceInput) => {
      const res = await fetch("/api/workforce/leave/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to save balance")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["leave-balances"] }),
  })
}

// ── Equipment Assignments (7.6) ────────────────────────────────────────────────

export type { EquipmentAssignment, EquipmentMeta }

export interface AssignEquipmentInput {
  userId: string
  equipmentType: string
  label?: string | null
  serialNumber?: string | null
  assignedDate: string
  expectedReturnDate?: string | null
  condition?: "new" | "good" | "fair" | "poor" | "damaged"
  notes?: string | null
}

export function useEquipmentAssignments(userId?: string | null, status?: string | null) {
  return useQuery({
    queryKey: ["equipment", userId ?? "all", status ?? "all"],
    queryFn: () =>
      fetch(buildUrl("/api/workforce/equipment", { userId, status })).then(
        (r) => r.json() as Promise<{ items: EquipmentAssignment[]; meta: EquipmentMeta }>
      ),
  })
}

export function useAssignEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssignEquipmentInput) => {
      const res = await fetch("/api/workforce/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to assign equipment")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["equipment"] }),
  })
}

export function useUpdateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/workforce/equipment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Failed to update equipment")
      return res.json() as Promise<{ id: string; status: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["equipment"] }),
  })
}

export function useDeleteEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workforce/equipment/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete equipment")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["equipment"] }),
  })
}

// ── Performance (7.5) ──────────────────────────────────────────────────────────

export type { PerformanceRow, PerformanceSummary }

export function usePerformance(from?: string | null, to?: string | null) {
  return useQuery({
    queryKey: ["performance", from ?? "d", to ?? "d"],
    queryFn: () =>
      fetch(buildUrl("/api/workforce/performance", { from, to })).then(
        (r) =>
          r.json() as Promise<{
            rows: PerformanceRow[]
            summary: PerformanceSummary
            range: { from: string; to: string }
          }>
      ),
    staleTime: 60_000,
  })
}

export function useRatePerformance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      period: string
      rating: number
      note?: string | null
    }) => {
      const res = await fetch("/api/workforce/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to save rating")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["performance"] }),
  })
}

// ── Public Holidays (7.3) ──────────────────────────────────────────────────────

export type { Holiday }

export interface HolidayInput {
  name: string
  date: string
  country?: string
  region?: string | null
  isRecurring?: boolean
}

export function usePublicHolidays(year?: number | null, country?: string | null) {
  return useQuery({
    queryKey: ["holidays", year ?? "current", country ?? "all"],
    queryFn: () =>
      fetch(
        buildUrl("/api/workforce/holidays", { year: year ? String(year) : undefined, country })
      ).then((r) => r.json() as Promise<{ holidays: Holiday[]; year: number; count: number }>),
  })
}

export function useAddHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: HolidayInput) => {
      const res = await fetch("/api/workforce/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to add holiday")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["holidays"] }),
  })
}

export function useDeleteHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/workforce/holidays/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete holiday")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["holidays"] }),
  })
}

// ── Employment Contracts (8.1) ─────────────────────────────────────────────────

export type { ContractSummary, ContractMeta }

export interface CreateContractInput {
  userId: string
  type?: "permanent" | "fixed_term" | "contractor" | "intern"
  status?: "draft" | "active"
  roleTitle: string
  startDate: string
  endDate?: string | null
  salaryAmount?: number | null
  salaryCurrency?: string
  payPeriod?: "hourly" | "monthly" | "annual"
  noticePeriodDays?: number | null
  terms?: string | null
  supersedesId?: string | null
}

export function useContracts(userId?: string | null, status?: string | null) {
  return useQuery({
    queryKey: ["contracts", userId ?? "all", status ?? "all"],
    queryFn: () =>
      fetch(buildUrl("/api/contracts", { userId, status })).then(
        (r) => r.json() as Promise<{ contracts: ContractSummary[]; meta: ContractMeta }>
      ),
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateContractInput) => {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to create contract")
      return res.json() as Promise<{ id: string; version: number }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["contracts"] }),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Failed to update contract")
      return res.json() as Promise<{ id: string; status: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["contracts"] }),
  })
}

export function useDeleteContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete contract")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["contracts"] }),
  })
}

// ── HR Compliance Documents (8.5) ──────────────────────────────────────────────

export type { ComplianceDoc, ComplianceMeta }

export interface ComplianceDocInput {
  userId: string
  docType?:
    | "passport"
    | "visa"
    | "id_card"
    | "driving_license"
    | "work_permit"
    | "certification"
    | "medical"
    | "other"
  title: string
  reference?: string | null
  issuedDate?: string | null
  expiryDate?: string | null
  status?: "pending" | "verified" | "rejected"
  notes?: string | null
}

export function useComplianceDocuments(userId?: string | null, docType?: string | null) {
  return useQuery({
    queryKey: ["compliance", userId ?? "all", docType ?? "all"],
    queryFn: () =>
      fetch(buildUrl("/api/compliance/documents", { userId, docType })).then(
        (r) => r.json() as Promise<{ documents: ComplianceDoc[]; meta: ComplianceMeta }>
      ),
  })
}

export function useAddComplianceDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ComplianceDocInput) => {
      const res = await fetch("/api/compliance/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to add document")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["compliance"] }),
  })
}

export function useUpdateComplianceDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/compliance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Failed to update document")
      return res.json() as Promise<{ id: string; status: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["compliance"] }),
  })
}

export function useDeleteComplianceDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/compliance/documents/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete document")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["compliance"] }),
  })
}

// ── Payroll Line Items / Payslips (8.2) ────────────────────────────────────────

export type { PayrollItem, PayrollItemsTotals }

export interface PayrollItemInput {
  userId: string
  baseAmount?: number
  overtimeHours?: number
  overtimeAmount?: number
  bonusAmount?: number
  allowanceAmount?: number
  deductionAmount?: number
  currency?: string
  notes?: string | null
}

export function usePayrollItems(runId: string | null) {
  return useQuery({
    queryKey: ["payroll-items", runId],
    enabled: !!runId,
    queryFn: () =>
      fetch(`/api/payroll/${runId}/items`).then(
        (r) => r.json() as Promise<{ items: PayrollItem[]; totals: PayrollItemsTotals }>
      ),
  })
}

export function useUpsertPayrollItem(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: PayrollItemInput) => {
      const res = await fetch(`/api/payroll/${runId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to save payslip line")
      return res.json() as Promise<{ id: string; gross: number; net: number }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["payroll-items", runId] })
      void qc.invalidateQueries({ queryKey: ["payroll", runId] })
    },
  })
}

export function useDeletePayrollItem(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/payroll/${runId}/items/${itemId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete payslip line")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["payroll-items", runId] })
      void qc.invalidateQueries({ queryKey: ["payroll", runId] })
    },
  })
}

// ── Recruitment (8.3) ──────────────────────────────────────────────────────────

export type { RequisitionSummary, RequisitionMeta, Candidate }

export type CandidateStage =
  | "sourcing"
  | "screening"
  | "phone_screen"
  | "interview"
  | "assessment"
  | "offer"
  | "hired"
  | "rejected"

export interface RequisitionInput {
  title: string
  departmentId?: string | null
  employmentType?: "permanent" | "fixed_term" | "contractor" | "intern"
  headcount?: number
  hiringManagerId?: string | null
  location?: string | null
  description?: string | null
}

export interface CandidateInput {
  requisitionId: string
  fullName: string
  email?: string | null
  phone?: string | null
  source?: string | null
  stage?: CandidateStage
  rating?: number | null
  notes?: string | null
}

export function useRequisitions() {
  return useQuery({
    queryKey: ["requisitions"],
    queryFn: () =>
      fetch("/api/recruitment/requisitions").then(
        (r) => r.json() as Promise<{ requisitions: RequisitionSummary[]; meta: RequisitionMeta }>
      ),
  })
}

export function useCreateRequisition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RequisitionInput) => {
      const res = await fetch("/api/recruitment/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to open requisition")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["requisitions"] }),
  })
}

export function useCandidates(requisitionId: string | null) {
  return useQuery({
    queryKey: ["candidates", requisitionId],
    enabled: !!requisitionId,
    queryFn: () =>
      fetch(`/api/recruitment/candidates?requisitionId=${requisitionId}`).then(
        (r) => r.json() as Promise<{ candidates: Candidate[] }>
      ),
  })
}

export function useCreateCandidate(requisitionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CandidateInput) => {
      const res = await fetch("/api/recruitment/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Failed to add candidate")
      return res.json() as Promise<{ id: string }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["candidates", requisitionId] })
      void qc.invalidateQueries({ queryKey: ["requisitions"] })
    },
  })
}

export function useUpdateCandidate(requisitionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/recruitment/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Failed to update candidate")
      return res.json() as Promise<{ id: string; stage: string }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["candidates", requisitionId] })
      void qc.invalidateQueries({ queryKey: ["requisitions"] })
    },
  })
}

export function useDeleteCandidate(requisitionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recruitment/candidates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete candidate")
      return res.json() as Promise<{ removed: number }>
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["candidates", requisitionId] })
      void qc.invalidateQueries({ queryKey: ["requisitions"] })
    },
  })
}
