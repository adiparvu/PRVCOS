import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { expenses, users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "RON" ? "RON " : currency === "EUR" ? "€" : `${currency} `
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}k`
  return `${symbol}${amount.toFixed(2)}`
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const expenseId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!expenseId) {
    return NextResponse.json({ error: "Missing expense ID" }, { status: 400 })
  }

  const [row] = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      category: expenses.category,
      status: expenses.status,
      amount: expenses.amount,
      currency: expenses.currency,
      date: expenses.date,
      notes: expenses.notes,
      receiptUrl: expenses.receiptUrl,
      submittedById: expenses.submittedById,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.id, expenseId),
        eq(expenses.companyId, ctx.companyId),
        isNull(expenses.deletedAt)
      )
    )
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: "Expense not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const [submitterRow] = row.submittedById
    ? await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, row.submittedById))
        .limit(1)
    : []

  const amt = Number(row.amount)

  return NextResponse.json({
    expense: {
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      amount: amt,
      amountFormatted: formatCurrency(amt, row.currency),
      currency: row.currency,
      date: row.date,
      notes: row.notes ?? null,
      receiptUrl: row.receiptUrl ?? null,
      createdAt: row.createdAt.toISOString(),
    },
    submittedBy: submitterRow
      ? { name: `${submitterRow.firstName} ${submitterRow.lastName}` }
      : null,
  })
})

const patchSchema = z.object({
  status: z.enum(["submitted", "approved", "rejected", "paid"]),
})

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const expenseId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!expenseId) {
    return NextResponse.json({ error: "Missing expense ID" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { status } = parsed.data

  const [existing] = await db
    .select({ id: expenses.id, status: expenses.status })
    .from(expenses)
    .where(
      and(
        eq(expenses.id, expenseId),
        eq(expenses.companyId, ctx.companyId),
        isNull(expenses.deletedAt)
      )
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  const [updated] = await db
    .update(expenses)
    .set({ status, updatedAt: new Date() })
    .where(eq(expenses.id, expenseId))
    .returning({ id: expenses.id, status: expenses.status })

  if (!updated) {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.expense.status_update",
    entityType: "expense",
    entityId: expenseId,
    method: "PATCH",
    path: `/api/mobile/expenses/${expenseId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { from: existing.status, to: status },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
})
