"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
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
import type { KnowledgeArticle, KnowledgeMeta } from "@/app/api/knowledge/route"
import type { Course, Achievement, LearningMeta } from "@/app/api/learning/route"
import type { ShiftSummary, ShiftsMeta } from "@/app/api/schedule/route"
import type { SupplierSummary } from "@/app/api/suppliers/route"
import type { ToolSummary, ToolsMeta } from "@/app/api/tools/route"
import type { OperationsMeta, Store, Task, Order, Alert } from "@/app/api/operations/route"
import type { Insight, Report, StoreKpi, IntelligenceMeta } from "@/app/api/intelligence/route"
import type { FinanceReport } from "@/app/api/finance/reports/route"


const LIMIT = 50

function buildUrl(base: string, params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "" && v !== "all" && v !== "Toate" && v !== "Toți" && v !== "Recente") {
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
      fetch(
        buildUrl("/api/crm/clients", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<ClientsPage>),
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
      fetch(
        buildUrl("/api/projects", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<ProjectsPage>),
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
      fetch(
        buildUrl("/api/procurement", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<ProcurementPage>),
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
      fetch(
        buildUrl("/api/documents", { category, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<DocumentsPage>),
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
      fetch(buildUrl("/api/people", { search: search ?? null, cursor: pageParam as string | null, limit: "100" })).then(
        (r) => r.json() as Promise<PeoplePage>
      ),
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
      fetch(
        buildUrl("/api/attendance", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<AttendancePage>),
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
      fetch(
        buildUrl("/api/fleet", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<FleetPage>),
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
      fetch(
        buildUrl("/api/knowledge", { category, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<KnowledgePage>),
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
      fetch(
        buildUrl("/api/learning", { category, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<LearningPage>),
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
}

export function useShifts(status?: string | null) {
  return useInfiniteQuery({
    queryKey: ["schedule", status ?? "all"],
    queryFn: async ({ pageParam }) =>
      fetch(
        buildUrl("/api/schedule", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<ShiftsPage>),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? null,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      shifts: data.pages.flatMap((p) => p.shifts),
      meta: data.pages[0]?.meta ?? null,
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
      fetch(
        buildUrl("/api/suppliers", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<SuppliersPage>),
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
      fetch(
        buildUrl("/api/tools", { status, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<ToolsPage>),
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
    queryFn: () =>
      fetch("/api/operations").then((r) => r.json() as Promise<OperationsData>),
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
      fetch(
        buildUrl("/api/notifications", { filter, cursor: pageParam as string | null })
      ).then((r) => r.json() as Promise<NotificationsPage>),
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

