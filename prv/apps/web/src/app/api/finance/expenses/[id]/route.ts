import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import type { ExpenseCategory, ExpenseStatus } from "../route"
import { db } from "@prv/db"
import { expenses, notifications } from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ApprovalStep {
  id: string
  role: string
  name: string
  avatar: string
  status: "approved" | "pending" | "locked"
  approvedAt: string
  note: string
}

export interface ExpenseLineItem {
  id: string
  description: string
  quantity: number
  unitPriceLabel: string
  totalLabel: string
}

export interface ExpenseDetail {
  id: string
  category: ExpenseCategory
  status: ExpenseStatus
  title: string
  amount: number
  amountLabel: string
  baseAmount: number
  baseAmountLabel: string
  vatAmount: number
  vatLabel: string
  vatPct: number
  vendorName: string
  vendorId: string
  vendorAddress: string
  vendorCui: string
  date: string
  dueDate: string
  description: string
  approvalStage: number
  approvalSteps: ApprovalStep[]
  lineItems: ExpenseLineItem[]
}

// ─── Maps ─────────────────────────────────────────────────────────────────────

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

const DB_TO_UI_STATUS: Record<string, ExpenseStatus> = {
  draft: "draft",
  submitted: "pending",
  approved: "approved",
  rejected: "rejected",
  paid: "approved",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtLabel(amount: number, currency = "RON"): string {
  const n = Math.round(amount)
  const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return currency === "EUR" ? `€${s}` : `${s} ${currency}`
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

function descriptionFromNotes(notes: string | null): string {
  if (!notes) return "—"
  const lines = notes.split("\n")
  // If first line is vendor name, skip it and return rest
  return lines.slice(1).join(" ").trim() || lines[0] || "—"
}

function buildApprovalSteps(dbStatus: string, stage: number): ApprovalStep[] {
  type StepStatus = "approved" | "pending" | "locked"

  const resolveStatus = (stepIndex: number): StepStatus => {
    if (dbStatus === "approved" || dbStatus === "paid") return "approved"
    if (dbStatus === "rejected") {
      if (stepIndex < stage) return "approved"
      if (stepIndex === stage) return "pending"
      return "locked"
    }
    // draft or submitted
    if (stepIndex < stage) return "approved"
    if (stepIndex === stage) return "pending"
    return "locked"
  }

  const steps: Array<{ role: string; name: string; avatar: string }> = [
    { role: "Manager Regional", name: "Manager Regional", avatar: "MR" },
    { role: "Director Financiar", name: "Director Financiar", avatar: "DF" },
    { role: "CEO", name: "CEO", avatar: "CE" },
  ]

  return steps.map((s, i) => {
    const st = resolveStatus(i)
    return {
      id: `step-${i + 1}`,
      role: s.role,
      name: s.name,
      avatar: s.avatar,
      status: st,
      approvedAt: st === "approved" ? "Aprobat" : "",
      note: "",
    }
  })
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "finance.expenses.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const rows = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, id),
          eq(expenses.companyId, ctx.session.companyId),
          isNull(expenses.deletedAt)
        )
      )
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const gross = Number(row.amount)
    const vatAmt = gross * (19 / 119)
    const baseAmt = gross - vatAmt
    const currency = row.currency
    const stage = stageFromDbStatus(row.status)
    const uiStatus = DB_TO_UI_STATUS[row.status] ?? "draft"
    const uiCategory = DB_TO_UI_CATEGORY[row.category] ?? "altele"

    const dueD = new Date(row.date)
    dueD.setDate(dueD.getDate() + 15)
    const dueDate = dueD.toISOString().slice(0, 10)

    const detail: ExpenseDetail = {
      id: row.id,
      category: uiCategory,
      status: uiStatus,
      title: row.title,
      amount: gross,
      amountLabel: fmtLabel(gross, currency),
      baseAmount: Math.round(baseAmt),
      baseAmountLabel: fmtLabel(Math.round(baseAmt), currency),
      vatAmount: Math.round(vatAmt),
      vatLabel: fmtLabel(Math.round(vatAmt), currency),
      vatPct: 19,
      vendorName: vendorFromNotes(row.notes),
      vendorId: "—",
      vendorAddress: "—",
      vendorCui: "—",
      date: row.date,
      dueDate,
      description: descriptionFromNotes(row.notes),
      approvalStage: stage,
      approvalSteps: buildApprovalSteps(row.status, stage),
      lineItems: [],
    }

    return NextResponse.json(detail)
  }
)

// ─── PATCH /api/finance/expenses/[id] ────────────────────────────────────────

const patchExpenseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  category: z
    .enum([
      "materials",
      "labor",
      "equipment",
      "transport",
      "rent",
      "utilities",
      "marketing",
      "salaries",
      "subscriptions",
      "other",
    ])
    .optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected", "paid"]).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  receiptUrl: z.string().url().nullable().optional(),
})

export const PATCH = withGates(
  { action: "finance.expenses.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({
        id: expenses.id,
        status: expenses.status,
        submittedById: expenses.submittedById,
        title: expenses.title,
      })
      .from(expenses)
      .where(
        and(eq(expenses.id, id), eq(expenses.companyId, companyId), isNull(expenses.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { amount, ...expenseFields } = parsed.data
    const [updated] = await db
      .update(expenses)
      .set({
        ...expenseFields,
        ...(amount !== undefined ? { amount: String(amount) } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(expenses.id, id), eq(expenses.companyId, companyId), isNull(expenses.deletedAt))
      )
      .returning({ id: expenses.id })

    // Notify the submitter when their expense is decided. Fires only on a real
    // transition into approved/rejected (not a no-op re-save), to the
    // unambiguous submitter, skipping self-actions and unassigned expenses.
    const decided = parsed.data.status
    if (
      (decided === "approved" || decided === "rejected") &&
      decided !== existing.status &&
      existing.submittedById &&
      existing.submittedById !== ctx.session.userId
    ) {
      const notice =
        decided === "approved"
          ? {
              type: "success" as const,
              title: "Cheltuială aprobată",
              body: `Cheltuiala „${existing.title}" a fost aprobată.`,
            }
          : {
              type: "warning" as const,
              title: "Cheltuială respinsă",
              body: `Cheltuiala „${existing.title}" a fost respinsă.`,
            }
      await db.insert(notifications).values({
        userId: existing.submittedById,
        companyId,
        type: notice.type,
        channel: "in_app",
        title: notice.title.slice(0, 500),
        body: notice.body,
        entityType: "expense",
        entityId: id,
        actionUrl: `/finance/expenses/${id}`,
        deliveredAt: new Date(),
      })
    }

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "finance.expenses.update",
      entityType: "expense",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/finance/expenses/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/finance/expenses/[id] ───────────────────────────────────────

export const DELETE = withGates(
  { action: "finance.expenses.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({
        id: expenses.id,
        status: expenses.status,
        submittedById: expenses.submittedById,
        title: expenses.title,
      })
      .from(expenses)
      .where(
        and(eq(expenses.id, id), eq(expenses.companyId, companyId), isNull(expenses.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(expenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(expenses.id, id), eq(expenses.companyId, companyId), isNull(expenses.deletedAt))
      )

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "finance.expenses.delete",
      entityType: "expense",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/finance/expenses/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
