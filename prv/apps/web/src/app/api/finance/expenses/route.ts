import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

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

const MOCK_EXPENSES: Expense[] = [
  {
    id: "exp-001",
    category: "materiale",
    status: "pending",
    title: "Materiale construcție lot 3/2026",
    amount: 8740,
    amountLabel: "€8,740",
    vatAmount: 1395,
    vatLabel: "€1,395",
    vendorName: "Materiale Building SRL",
    date: "2026-06-05",
    dueDate: "2026-06-20",
    approvalStage: 2,
  },
  {
    id: "exp-002",
    category: "personal",
    status: "approved",
    title: "Salarii echipă mai 2026",
    amount: 42000,
    amountLabel: "€42,000",
    vatAmount: 0,
    vatLabel: "—",
    vendorName: "HR Intern",
    date: "2026-05-31",
    dueDate: "2026-06-01",
    approvalStage: 3,
  },
  {
    id: "exp-003",
    category: "logistica",
    status: "approved",
    title: "Combustibil flotă mai 2026",
    amount: 3280,
    amountLabel: "€3,280",
    vatAmount: 524,
    vatLabel: "€524",
    vendorName: "OMV România",
    date: "2026-05-30",
    dueDate: "2026-06-05",
    approvalStage: 3,
  },
  {
    id: "exp-004",
    category: "marketing",
    status: "approved",
    title: "Marketing digital Q2 2026",
    amount: 5600,
    amountLabel: "€5,600",
    vatAmount: 896,
    vatLabel: "€896",
    vendorName: "Digital Agency SRL",
    date: "2026-05-28",
    dueDate: "2026-06-10",
    approvalStage: 3,
  },
  {
    id: "exp-005",
    category: "utilitati",
    status: "approved",
    title: "Utilități magazine mai 2026",
    amount: 4120,
    amountLabel: "€4,120",
    vatAmount: 659,
    vatLabel: "€659",
    vendorName: "E.ON Energie România",
    date: "2026-05-27",
    dueDate: "2026-06-07",
    approvalStage: 3,
  },
  {
    id: "exp-006",
    category: "logistica",
    status: "pending",
    title: "Leasing utilaje Q2 2026",
    amount: 12800,
    amountLabel: "€12,800",
    vatAmount: 2048,
    vatLabel: "€2,048",
    vendorName: "UniCredit Leasing",
    date: "2026-06-01",
    dueDate: "2026-06-15",
    approvalStage: 1,
  },
  {
    id: "exp-007",
    category: "altele",
    status: "approved",
    title: "Servicii contabilitate mai 2026",
    amount: 2400,
    amountLabel: "€2,400",
    vatAmount: 384,
    vatLabel: "€384",
    vendorName: "Audit & Tax SRL",
    date: "2026-05-25",
    dueDate: "2026-06-01",
    approvalStage: 3,
  },
  {
    id: "exp-008",
    category: "materiale",
    status: "draft",
    title: "Reparații urgente magazin Iași",
    amount: 1860,
    amountLabel: "€1,860",
    vatAmount: 297,
    vatLabel: "€297",
    vendorName: "Service Rapid SRL",
    date: "2026-06-06",
    dueDate: "2026-06-21",
    approvalStage: 0,
  },
]

const MOCK_PL: PlRow[] = [
  { label: "Venituri totale", valueLabel: "€545k", pct: 100, colorKey: "green" },
  { label: "Cost Bunuri", valueLabel: "€183k", pct: 34, colorKey: "red" },
  { label: "Profit Brut", valueLabel: "€362k", pct: 66, colorKey: "blue" },
  { label: "Cheltuieli Op.", valueLabel: "€103k", pct: 19, colorKey: "amber" },
  { label: "Profit Net", valueLabel: "€259k", pct: 47, colorKey: "green" },
]

const MOCK_META: FinanceMeta = {
  totalRevenueLabel: "€545k",
  revenueTrend: "+8%",
  totalExpensesLabel: "€286k",
  expensesTrend: "+3%",
  profitLabel: "€259k",
  profitTrend: "+14%",
  vatLabel: "€62k",
}

export const GET = withGates(
  { action: "finance.expenses.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as ExpenseStatus | null
    const category = searchParams.get("category") as ExpenseCategory | null

    let expenses = MOCK_EXPENSES
    if (status) expenses = expenses.filter((e) => e.status === status)
    if (category) expenses = expenses.filter((e) => e.category === category)

    return NextResponse.json({ expenses, plData: MOCK_PL, meta: MOCK_META })
  }
)

export const POST = withGates(
  { action: "finance.expenses.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const { title, period, projectRef, notes, lines, status } = body

    const expenseId = `exp-${Date.now()}`
    const today = new Date().toISOString().slice(0, 10)

    const totalNet = (lines ?? []).reduce(
      (s: number, l: { amount: number }) => s + (l.amount ?? 0),
      0
    )
    const totalVat = (lines ?? []).reduce(
      (s: number, l: { amount: number; vatRate: number }) =>
        s + (l.amount ?? 0) * ((l.vatRate ?? 0) / 100),
      0
    )
    const totalGross = totalNet + totalVat

    const newExpense: Expense = {
      id: expenseId,
      category: lines?.[0]?.category ?? "altele",
      status: (status as ExpenseStatus) ?? "draft",
      title: title ?? "Cheltuială nouă",
      amount: Math.round(totalNet),
      amountLabel: `€${Math.round(totalNet).toLocaleString("ro-RO")}`,
      vatAmount: Math.round(totalVat),
      vatLabel: totalVat > 0 ? `€${Math.round(totalVat).toLocaleString("ro-RO")}` : "—",
      vendorName: lines?.[0]?.vendorName ?? "",
      date: today,
      dueDate: today,
      approvalStage: 0,
    }

    await writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "finance.expenses.create",
      entityType: "expense",
      entityId: expenseId,
      payload: {
        title,
        period,
        projectRef,
        lineCount: (lines ?? []).length,
        totalNet: newExpense.amount,
        totalVat: newExpense.vatAmount,
        totalGross: Math.round(totalGross),
        status: newExpense.status,
      },
    })

    return NextResponse.json({ expense: newExpense }, { status: 201 })
  }
)
