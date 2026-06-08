import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, expenses } from "@prv/db/schema"
import { eq, and, isNull, desc, sum, inArray, gte, lt, notInArray } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ExpenseCategory =
  | "materiale"
  | "personal"
  | "logistica"
  | "utilitati"
  | "marketing"
  | "altele"
export type ExpenseStatus = "draft" | "pending" | "approved" | "rejected"

export interface Expense {
  id: string
  category: ExpenseCategory
  status: ExpenseStatus
  title: string
  amount: number
  amountLabel: string
  vatAmount: number
  vatLabel: string
  vendorName: string
  date: string
  dueDate: string
  approvalStage: number
}

export interface PlRow {
  label: string
  valueLabel: string
  pct: number
  colorKey: "green" | "red" | "blue" | "amber"
}

export interface FinanceMeta {
  totalRevenueLabel: string
  revenueTrend: string
  totalExpensesLabel: string
  expensesTrend: string
  profitLabel: string
  profitTrend: string
  vatLabel: string
}

// ─── Category / Status Maps ───────────────────────────────────────────────────

const DB_TO_UI_CATEGORY: Record<string, ExpenseCategory> = {
  materials: "materiale",
  labor: "personal",
  salaries: "personal",
  equipment: "logistica",
  transport: "logistica",
  rent: "utilitati",
  utilities: "utilitati",
  subscriptions: "utilitati",
  marketing: "marketing",
  other: "altele",
}

const UI_TO_DB_CATEGORY: Record<ExpenseCategory, string> = {
  materiale: "materials",
  personal: "labor",
  logistica: "equipment",
  utilitati: "utilities",
  marketing: "marketing",
  altele: "other",
}

const DB_TO_UI_STATUS: Record<string, ExpenseStatus> = {
  draft: "draft",
  submitted: "pending",
  approved: "approved",
  rejected: "rejected",
  paid: "approved",
}

const UI_TO_DB_STATUS: Record<string, string> = {
  draft: "draft",
  pending: "submitted",
  approved: "approved",
  rejected: "rejected",
}

type DbExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "paid"
type DbExpenseCategory =
  | "materials"
  | "labor"
  | "equipment"
  | "transport"
  | "rent"
  | "utilities"
  | "marketing"
  | "salaries"
  | "subscriptions"
  | "other"

const ACTIVE_EXP_STATUSES: DbExpenseStatus[] = ["approved", "paid"]
const COGS_CATEGORIES: DbExpenseCategory[] = ["materials", "labor", "salaries"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtLabel(amount: number, currency = "RON"): string {
  const n = Math.round(amount)
  const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return currency === "EUR" ? `€${s}` : `${s} ${currency}`
}

function fmtKpi(amount: number, currency = "RON"): string {
  const abs = Math.abs(amount)
  let val: string
  if (abs >= 1_000_000) val = `${(amount / 1_000_000).toFixed(1)}M`
  else if (abs >= 1_000) val = `${Math.round(amount / 1_000)}k`
  else val = String(Math.round(amount))
  return currency === "EUR" ? `€${val}` : `${val} RON`
}

function fmtTrend(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? "+100%" : "0%"
  const pct = Math.round(((current - prev) / Math.abs(prev)) * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

function stageFromDbStatus(dbStatus: string): number {
  switch (dbStatus) {
    case "submitted":
      return 1
    case "approved":
      return 3
    case "paid":
      return 3
    case "rejected":
      return 2
    default:
      return 0
  }
}

function vendorFromNotes(notes: string | null): string {
  if (!notes) return "—"
  const first = notes.split("\n")[0]?.trim()
  return first || "—"
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "finance.expenses.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const filterStatus = searchParams.get("status") as ExpenseStatus | null
    const filterCategory = searchParams.get("category") as ExpenseCategory | null

    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`
    const yearEnd = `${currentYear + 1}-01-01`
    const prevYearStart = `${currentYear - 1}-01-01`

    // Run all queries in parallel
    const [expenseRows, revenueAgg, cogsAgg, opexAgg, vatAgg, prevRevenueAgg, prevExpAgg] =
      await Promise.all([
        // Expenses list
        db
          .select()
          .from(expenses)
          .where(and(eq(expenses.companyId, ctx.session.companyId), isNull(expenses.deletedAt)))
          .orderBy(desc(expenses.date)),

        // Revenue YTD (paid invoices)
        db
          .select({ total: sum(invoices.total) })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, ctx.session.companyId),
              eq(invoices.status, "paid"),
              gte(invoices.issueDate, yearStart),
              lt(invoices.issueDate, yearEnd),
              isNull(invoices.deletedAt)
            )
          ),

        // COGS YTD (materials/labor expenses)
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.companyId, ctx.session.companyId),
              inArray(expenses.status, ACTIVE_EXP_STATUSES),
              inArray(expenses.category, COGS_CATEGORIES),
              gte(expenses.date, yearStart),
              lt(expenses.date, yearEnd),
              isNull(expenses.deletedAt)
            )
          ),

        // OpEx YTD (non-COGS expenses)
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.companyId, ctx.session.companyId),
              inArray(expenses.status, ACTIVE_EXP_STATUSES),
              notInArray(expenses.category, COGS_CATEGORIES),
              gte(expenses.date, yearStart),
              lt(expenses.date, yearEnd),
              isNull(expenses.deletedAt)
            )
          ),

        // VAT YTD (paid invoices)
        db
          .select({ total: sum(invoices.vatAmount) })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, ctx.session.companyId),
              eq(invoices.status, "paid"),
              gte(invoices.issueDate, yearStart),
              lt(invoices.issueDate, yearEnd),
              isNull(invoices.deletedAt)
            )
          ),

        // Previous year revenue
        db
          .select({ total: sum(invoices.total) })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, ctx.session.companyId),
              eq(invoices.status, "paid"),
              gte(invoices.issueDate, prevYearStart),
              lt(invoices.issueDate, yearStart),
              isNull(invoices.deletedAt)
            )
          ),

        // Previous year expenses
        db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.companyId, ctx.session.companyId),
              inArray(expenses.status, ACTIVE_EXP_STATUSES),
              gte(expenses.date, prevYearStart),
              lt(expenses.date, yearStart),
              isNull(expenses.deletedAt)
            )
          ),
      ])

    // ── Map expense rows to UI shape ──────────────────────────────────────────
    let list: Expense[] = []
    for (const r of expenseRows) {
      const uiStatus = DB_TO_UI_STATUS[r.status] ?? "draft"
      const uiCategory = DB_TO_UI_CATEGORY[r.category] ?? "altele"
      if (filterStatus && uiStatus !== filterStatus) continue
      if (filterCategory && uiCategory !== filterCategory) continue

      const gross = Number(r.amount)
      const vatAmt = gross * (19 / 119)
      const currency = r.currency

      // dueDate = date + 15 days (no dueDate column in schema)
      const d = new Date(r.date)
      d.setDate(d.getDate() + 15)
      const dueDate = d.toISOString().slice(0, 10)

      list.push({
        id: r.id,
        category: uiCategory,
        status: uiStatus,
        title: r.title,
        amount: gross,
        amountLabel: fmtLabel(gross, currency),
        vatAmount: Math.round(vatAmt),
        vatLabel: vatAmt > 0 ? fmtLabel(Math.round(vatAmt), currency) : "—",
        vendorName: vendorFromNotes(r.notes),
        date: r.date,
        dueDate,
        approvalStage: stageFromDbStatus(r.status),
      })
    }

    // ── Aggregate KPIs ────────────────────────────────────────────────────────
    const revenue = Number(revenueAgg[0]?.total ?? "0")
    const cogs = Number(cogsAgg[0]?.total ?? "0")
    const opex = Number(opexAgg[0]?.total ?? "0")
    const totalExpenses = cogs + opex
    const vat = Number(vatAgg[0]?.total ?? "0")
    const grossProfit = revenue - cogs
    const netProfit = grossProfit - opex
    const prevRevenue = Number(prevRevenueAgg[0]?.total ?? "0")
    const prevExp = Number(prevExpAgg[0]?.total ?? "0")

    const meta: FinanceMeta = {
      totalRevenueLabel: fmtKpi(revenue),
      revenueTrend: fmtTrend(revenue, prevRevenue),
      totalExpensesLabel: fmtKpi(totalExpenses),
      expensesTrend: fmtTrend(totalExpenses, prevExp),
      profitLabel: fmtKpi(netProfit),
      profitTrend: fmtTrend(netProfit, prevRevenue - prevExp),
      vatLabel: fmtKpi(vat),
    }

    const plData: PlRow[] =
      revenue > 0
        ? [
            { label: "Venituri totale", valueLabel: fmtKpi(revenue), pct: 100, colorKey: "green" },
            {
              label: "Cost Bunuri",
              valueLabel: fmtKpi(cogs),
              pct: Math.round((cogs / revenue) * 100),
              colorKey: "red",
            },
            {
              label: "Profit Brut",
              valueLabel: fmtKpi(grossProfit),
              pct: Math.round((grossProfit / revenue) * 100),
              colorKey: "blue",
            },
            {
              label: "Cheltuieli Op.",
              valueLabel: fmtKpi(opex),
              pct: Math.round((opex / revenue) * 100),
              colorKey: "amber",
            },
            {
              label: "Profit Net",
              valueLabel: fmtKpi(netProfit),
              pct: Math.round((netProfit / revenue) * 100),
              colorKey: "green",
            },
          ]
        : []

    return NextResponse.json({ expenses: list, plData, meta })
  }
)

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST = withGates(
  { action: "finance.expenses.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { title, period, projectRef, notes, lines, status } = body as {
      title?: string
      period?: string
      projectRef?: string
      notes?: string
      lines?: Array<{ amount?: number; vatRate?: number; category?: string; vendorName?: string }>
      status?: string
    }

    const totalNet = (lines ?? []).reduce((s, l) => s + (l.amount ?? 0), 0)
    const totalVat = (lines ?? []).reduce(
      (s, l) => s + (l.amount ?? 0) * ((l.vatRate ?? 19) / 100),
      0
    )
    const totalGross = totalNet + totalVat

    const dbCategory =
      UI_TO_DB_CATEGORY[(lines?.[0]?.category as ExpenseCategory) ?? "altele"] ?? "other"
    const dbStatus = UI_TO_DB_STATUS[status ?? "draft"] ?? "draft"
    const today = new Date().toISOString().slice(0, 10)

    // Store vendor name as first line of notes
    const vendorName = lines?.[0]?.vendorName ?? ""
    const combinedNotes =
      vendorName && notes ? `${vendorName}\n${notes}` : vendorName || notes || null

    const [created] = await db
      .insert(expenses)
      .values({
        companyId: ctx.session.companyId,
        submittedById: ctx.session.userId,
        title: title ?? "Cheltuială nouă",
        category: dbCategory as (typeof expenses.$inferInsert)["category"],
        status: dbStatus as (typeof expenses.$inferInsert)["status"],
        amount: String(Math.round(totalGross * 100) / 100),
        currency: "RON",
        date: today,
        notes: combinedNotes,
      })
      .returning({ id: expenses.id })

    if (!created) {
      return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "finance.expenses.create",
      entityType: "expense",
      entityId: created.id,
      payload: {
        title,
        period,
        projectRef,
        lineCount: (lines ?? []).length,
        totalNet: Math.round(totalNet),
        totalVat: Math.round(totalVat),
        totalGross: Math.round(totalGross),
        status: dbStatus,
      },
      method: "POST",
      path: "/api/finance/expenses",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    const uiStatus = DB_TO_UI_STATUS[dbStatus] ?? "draft"
    const uiCategory = DB_TO_UI_CATEGORY[dbCategory] ?? "altele"
    const gross = Math.round(totalGross)
    const vatAmt = Math.round(totalVat)

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 15)

    const newExpense: Expense = {
      id: created.id,
      category: uiCategory,
      status: uiStatus,
      title: title ?? "Cheltuială nouă",
      amount: gross,
      amountLabel: fmtLabel(gross),
      vatAmount: vatAmt,
      vatLabel: vatAmt > 0 ? fmtLabel(vatAmt) : "—",
      vendorName: vendorName || "—",
      date: today,
      dueDate: dueDate.toISOString().slice(0, 10),
      approvalStage: stageFromDbStatus(dbStatus),
    }

    return NextResponse.json({ expense: newExpense }, { status: 201 })
  }
)
