import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { budgets, expenses } from "@prv/db/schema"
import { eq, and, isNull, sum, inArray, gte, lt, desc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface BudgetWithSpend {
  id: string
  name: string
  category: string
  periodKey: string
  periodType: string
  capAmount: number
  capLabel: string
  spentAmount: number
  spentLabel: string
  spentPct: number
  remaining: number
  remainingLabel: string
  status: "ok" | "warning" | "exceeded"
  currency: string
  storeId: string | null
  notes: string | null
}

function fmtCurrency(n: number, currency = "RON"): string {
  const s = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return currency === "EUR" ? `€${s}` : `${s} ${currency}`
}

function periodKeyToRange(periodKey: string, periodType: string): { from: string; to: string } {
  // monthly: "2025-01" → Jan 1 – Feb 1
  if (periodType === "monthly" && /^\d{4}-\d{2}$/.test(periodKey)) {
    const [y, m] = periodKey.split("-").map(Number) as [number, number]
    const from = `${y}-${String(m).padStart(2, "0")}-01`
    const nextMonth = m === 12 ? 1 : m + 1
    const nextYear = m === 12 ? y + 1 : y
    const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
    return { from, to }
  }
  // quarterly: "2025-Q1" → Jan 1 – Apr 1
  if (periodType === "quarterly" && /^\d{4}-Q[1-4]$/.test(periodKey)) {
    const [y, q] = [parseInt(periodKey), parseInt(periodKey.split("Q")[1]!)] as [number, number]
    const year = parseInt(periodKey.slice(0, 4))
    const startMonth = (q - 1) * 3 + 1
    const endMonth = startMonth + 3
    const endYear = endMonth > 12 ? year + 1 : year
    const endMonthAdj = endMonth > 12 ? endMonth - 12 : endMonth
    return {
      from: `${year}-${String(startMonth).padStart(2, "0")}-01`,
      to: `${endYear}-${String(endMonthAdj).padStart(2, "0")}-01`,
    }
  }
  // annual: "2025"
  const year = parseInt(periodKey)
  return { from: `${year}-01-01`, to: `${year + 1}-01-01` }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "finance.budgets.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const category = req.nextUrl.searchParams.get("category")
    const periodKey = req.nextUrl.searchParams.get("periodKey")
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 200)

    const conds = [eq(budgets.companyId, companyId), isNull(budgets.deletedAt)]
    if (periodKey) conds.push(eq(budgets.periodKey, periodKey))

    const rows = await db
      .select()
      .from(budgets)
      .where(and(...conds))
      .orderBy(desc(budgets.createdAt))
      .limit(limit)

    const filtered = category ? rows.filter((r) => r.category === category) : rows

    const PAID_STATUSES = ["approved", "paid"] as const

    const result: BudgetWithSpend[] = await Promise.all(
      filtered.map(async (b) => {
        const { from, to } = periodKeyToRange(b.periodKey, b.periodType)
        const [spendRow] = await db
          .select({ total: sum(expenses.amount) })
          .from(expenses)
          .where(
            and(
              eq(expenses.companyId, companyId),
              eq(expenses.category, b.category),
              inArray(expenses.status, [...PAID_STATUSES]),
              gte(expenses.date, from),
              lt(expenses.date, to),
              isNull(expenses.deletedAt)
            )
          )

        const cap = Number(b.capAmount)
        const spent = Number(spendRow?.total ?? 0)
        const pct = cap > 0 ? Math.round((spent / cap) * 1000) / 10 : 0
        const remaining = cap - spent
        const status: BudgetWithSpend["status"] =
          pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : "ok"

        return {
          id: b.id,
          name: b.name,
          category: b.category,
          periodKey: b.periodKey,
          periodType: b.periodType,
          capAmount: cap,
          capLabel: fmtCurrency(cap, b.currency),
          spentAmount: spent,
          spentLabel: fmtCurrency(spent, b.currency),
          spentPct: pct,
          remaining,
          remainingLabel: fmtCurrency(remaining, b.currency),
          status,
          currency: b.currency,
          storeId: b.storeId,
          notes: b.notes,
        }
      })
    )

    return NextResponse.json({ budgets: result, total: result.length })
  }
)

// ── POST ──────────────────────────────────────────────────────────────────────

const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum([
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
  ]),
  periodType: z.enum(["monthly", "quarterly", "annual"]).default("monthly"),
  periodKey: z.string().min(4).max(10),
  capAmount: z.number().positive(),
  currency: z.enum(["RON", "EUR", "USD"]).default("RON"),
  storeId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
})

export const POST = withGates(
  { action: "finance.budgets.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = createBudgetSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [created] = await db
      .insert(budgets)
      .values({
        companyId,
        createdByUserId: userId,
        ...parsed.data,
        capAmount: String(parsed.data.capAmount),
        storeId: parsed.data.storeId ?? null,
      })
      .returning({ id: budgets.id, name: budgets.name })

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.budgets.create",
      entityType: "budget",
      entityId: created.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/finance/budgets",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ budget: created }, { status: 201 })
  }
)
