"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
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
