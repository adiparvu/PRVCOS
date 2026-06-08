import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

// ── Expenses ───────────────────────────────────────────────────────────────────

export interface ExpenseCategoryRow {
  category: string
  amount: number
  amountFormatted: string
  count: number
  pct: number
}

export interface ExpenseItem {
  id: string
  title: string
  category: string
  amount: number
  amountFormatted: string
  date: string
  status: string
}

export interface ExpensesData {
  kpi: {
    totalMtd: string
    totalMtdRaw: number
    countMtd: number
    deltaPercent: number | null
    topCategory: string | null
  }
  categoryBreakdown: ExpenseCategoryRow[]
  recent: ExpenseItem[]
}

export function useExpenses() {
  return useQuery<ExpensesData>({
    queryKey: ["expenses"],
    queryFn: () => api.get<ExpensesData>("/api/mobile/expenses"),
    staleTime: 60_000,
    retry: 2,
  })
}

export interface DayRevenue {
  date: string
  total: number
}

export interface FinanceOrderItem {
  id: string
  orderNumber: string
  status: string
  amount: string
  createdAt: string
}

export interface FinanceInvoiceItem {
  id: string
  invoiceNumber: string
  clientName: string | null
  status: string
  amount: string
  currency: string
  dueDate: string | null
  paidAt: string | null
}

export interface FinanceData {
  revenueKpi: {
    thisMonth: string
    profitEstimate: string
    ordersCount: number
    avgOrderValue: string
    deltaPercent: number | null
  }
  dailyRevenue: DayRevenue[]
  recentOrders: FinanceOrderItem[]
  invoicesKpi: {
    outstanding: string
    overdueCount: number
    overdueAmount: string
    paidMtd: string
    draftCount: number
  }
  invoices: FinanceInvoiceItem[]
}

export function useFinance() {
  return useQuery<FinanceData>({
    queryKey: ["finance"],
    queryFn: () => api.get<FinanceData>("/api/mobile/finance"),
    staleTime: 60_000,
    retry: 2,
  })
}
