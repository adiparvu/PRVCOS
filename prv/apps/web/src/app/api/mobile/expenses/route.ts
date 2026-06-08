import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { expenses } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull, notInArray, gte, lt, sum, count, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "RON" ? "RON " : currency === "EUR" ? "€" : `${currency} `
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}k`
  return `${symbol}${amount.toFixed(2)}`
}

const EXCLUDED_STATUSES = ["draft", "rejected"] as const

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOfMonthStr = startOfMonth.toISOString().slice(0, 10)
  const startOfLastMonthStr = startOfLastMonth.toISOString().slice(0, 10)

  const [mtdRows, lastMonthRows, categoryRows, recentRows] = await Promise.all([
    // Current month totals
    db
      .select({ total: sum(expenses.amount), cnt: count() })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          isNull(expenses.deletedAt),
          notInArray(expenses.status, ["draft", "rejected"]),
          gte(expenses.date, startOfMonthStr)
        )
      ),

    // Last month total (for delta)
    db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          isNull(expenses.deletedAt),
          notInArray(expenses.status, ["draft", "rejected"]),
          gte(expenses.date, startOfLastMonthStr),
          lt(expenses.date, startOfMonthStr)
        )
      ),

    // Category breakdown (current month)
    db
      .select({
        category: expenses.category,
        total: sum(expenses.amount),
        cnt: count(),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, ctx.companyId),
          isNull(expenses.deletedAt),
          notInArray(expenses.status, ["draft", "rejected"]),
          gte(expenses.date, startOfMonthStr)
        )
      )
      .groupBy(expenses.category)
      .orderBy(desc(sum(expenses.amount))),

    // Recent 20 expenses (all time, any status)
    db
      .select({
        id: expenses.id,
        title: expenses.title,
        category: expenses.category,
        amount: expenses.amount,
        currency: expenses.currency,
        date: expenses.date,
        status: expenses.status,
      })
      .from(expenses)
      .where(and(eq(expenses.companyId, ctx.companyId), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(20),
  ])

  const totalMtd = Number(mtdRows[0]?.total ?? 0)
  const countMtd = mtdRows[0]?.cnt ?? 0
  const totalLastMonth = Number(lastMonthRows[0]?.total ?? 0)

  const deltaPercent =
    totalLastMonth > 0 ? Math.round(((totalMtd - totalLastMonth) / totalLastMonth) * 100) : null

  const grandTotal = categoryRows.reduce((s, r) => s + Number(r.total ?? 0), 0)
  const topCategory = categoryRows[0]?.category ?? null

  const currency = "RON"

  return NextResponse.json({
    kpi: {
      totalMtd: formatCurrency(totalMtd, currency),
      totalMtdRaw: totalMtd,
      countMtd,
      deltaPercent,
      topCategory,
    },
    categoryBreakdown: categoryRows.map((r) => {
      const amt = Number(r.total ?? 0)
      return {
        category: r.category,
        amount: amt,
        amountFormatted: formatCurrency(amt, currency),
        count: r.cnt,
        pct: grandTotal > 0 ? Math.round((amt / grandTotal) * 100) : 0,
      }
    }),
    recent: recentRows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      amount: Number(r.amount),
      amountFormatted: formatCurrency(Number(r.amount), r.currency),
      date: r.date,
      status: r.status,
    })),
  })
})

const postSchema = z.object({
  title: z.string().min(1).max(255),
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
    .default("other"),
  amount: z.number().positive(),
  currency: z.string().length(3).default("RON"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["draft", "submitted"]).default("draft"),
  notes: z.string().max(2000).optional(),
  storeId: z.string().uuid().optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { title, category, amount, currency, date, status, notes, storeId } = parsed.data

  const [expense] = await db
    .insert(expenses)
    .values({
      companyId: ctx.companyId,
      submittedById: ctx.userId,
      storeId: storeId ?? null,
      title,
      category,
      status,
      amount: String(amount),
      currency: currency.toUpperCase(),
      date,
      notes: notes ?? null,
    })
    .returning({ id: expenses.id, title: expenses.title, status: expenses.status })

  if (!expense) {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.expense.create",
    entityType: "expense",
    entityId: expense.id,
    method: "POST",
    path: "/api/mobile/expenses",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
  })

  return NextResponse.json(
    { id: expense.id, title: expense.title, status: expense.status },
    { status: 201 }
  )
})
