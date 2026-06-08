import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

// ── Revenue Report ─────────────────────────────────────────────────────────────

export interface RevenueTrendMonth {
  month: string
  total: number
  totalFormatted: string
  count: number
}

export interface RevenueReportData {
  kpi: {
    mtdTotal: number
    mtdFormatted: string
    lastMonthTotal: number
    lastMonthFormatted: string
    delta: number | null
    ytdTotal: number
    ytdFormatted: string
    mtdCount: number
    ytdCount: number
    avgOrderValue: number
    avgOrderValueFormatted: string
  }
  trend: RevenueTrendMonth[]
}

export function useRevenueReport() {
  return useQuery<RevenueReportData>({
    queryKey: ["report-revenue"],
    queryFn: () => api.get<RevenueReportData>("/api/mobile/reports/revenue"),
    staleTime: 120_000,
    retry: 2,
  })
}

// ── Projects Report ────────────────────────────────────────────────────────────

export interface ProjectStatusRow {
  status: string
  label: string
  count: number
  pct: number
}

export interface ProjectRecentRow {
  id: string
  name: string
  status: string
  dueDate: string | null
}

export interface ProjectsReportData {
  kpi: {
    totalProjects: number
    activeCount: number
    completedCount: number
    onHoldCount: number
    milestonesTotal: number
    milestonesComplete: number
    milestonesOverdue: number
    completedMtd: number
    completionRate: number
  }
  byStatus: ProjectStatusRow[]
  recent: ProjectRecentRow[]
}

export function useProjectsReport() {
  return useQuery<ProjectsReportData>({
    queryKey: ["report-projects"],
    queryFn: () => api.get<ProjectsReportData>("/api/mobile/reports/projects"),
    staleTime: 120_000,
    retry: 2,
  })
}

// ── Workforce Report ───────────────────────────────────────────────────────────

export interface WorkforceRoleRow {
  role: string
  label: string
  count: number
}

export interface WorkforceActiveUser {
  id: string
  name: string
  jobTitle: string | null
  role: string
  lastLoginAt: string | null
}

export interface WorkforceReportData {
  kpi: {
    totalUsers: number
    activeUsers: number
    recentlyActiveCount: number
    tasksTotal: number
    tasksComplete: number
    tasksCompletedMtd: number
    taskCompletionRate: number
  }
  byRole: WorkforceRoleRow[]
  recentlyActive: WorkforceActiveUser[]
}

export function useWorkforceReport() {
  return useQuery<WorkforceReportData>({
    queryKey: ["report-workforce"],
    queryFn: () => api.get<WorkforceReportData>("/api/mobile/reports/workforce"),
    staleTime: 120_000,
    retry: 2,
  })
}

// ── Invoices Report ────────────────────────────────────────────────────────────

export interface InvoiceStatusRow {
  status: string
  label: string
  count: number
  amount: number
  amountFormatted: string
}

export interface InvoiceTrendMonth {
  month: string
  issued: number
  issuedFormatted: string
  paid: number
  paidFormatted: string
}

export interface InvoicesReportData {
  kpi: {
    outstanding: number
    outstandingFormatted: string
    overdueAmount: number
    overdueFormatted: string
    overdueCount: number
    paidMtd: number
    paidMtdFormatted: string
    paidTotal: number
    paidCount: number
    collectionRate: number
  }
  byStatus: InvoiceStatusRow[]
  trend: InvoiceTrendMonth[]
}

export function useInvoicesReport() {
  return useQuery<InvoicesReportData>({
    queryKey: ["report-invoices"],
    queryFn: () => api.get<InvoicesReportData>("/api/mobile/reports/invoices"),
    staleTime: 120_000,
    retry: 2,
  })
}
