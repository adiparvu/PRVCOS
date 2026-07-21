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

const patchSchema = z
  .object({
    status: z.enum(["draft", "submitted", "approved", "rejected", "paid"]).optional(),
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
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    notes: z.string().optional(),
    receiptUrl: z.string().url().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

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

  const { amount, ...expenseFields } = parsed.data
  const [updated] = await db
    .update(expenses)
    .set({
      ...expenseFields,
      ...(amount !== undefined ? { amount: String(amount) } : {}),
      updatedAt: new Date(),
    })
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
    payload: { from: existing.status, ...parsed.data },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
})

// ─── DELETE /api/mobile/expenses/[id] ────────────────────────────────────────

export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const expenseId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!expenseId) return NextResponse.json({ error: "Missing expense ID" }, { status: 400 })

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

  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 })

  if (!["draft", "rejected"].includes(existing.status))
    return NextResponse.json(
      { error: `Cannot delete an expense with status '${existing.status}'` },
      { status: 409 }
    )

  await db
    .update(expenses)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenses.id, expenseId), eq(expenses.companyId, ctx.companyId)))

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.expense.delete",
    entityType: "expense",
    entityId: expenseId,
    method: "DELETE",
    path: `/api/mobile/expenses/${expenseId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: {},
  })

  return new NextResponse(null, { status: 204 })
})
