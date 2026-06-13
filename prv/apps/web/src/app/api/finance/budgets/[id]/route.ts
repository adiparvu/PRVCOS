import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { budgets } from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getBudgetId(req: NextRequest): string | null {
  return req.nextUrl.pathname.split("/").at(-1) ?? null
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "finance.budgets.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = getBudgetId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [budget] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.companyId, companyId), isNull(budgets.deletedAt)))
      .limit(1)

    if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ budget })
  }
)

// ── PATCH ─────────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  capAmount: z.number().positive().optional(),
  currency: z.enum(["RON", "EUR", "USD"]).optional(),
  notes: z.string().nullable().optional(),
})

export const PATCH = withGates(
  { action: "finance.budgets.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = getBudgetId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.companyId, companyId), isNull(budgets.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.capAmount !== undefined) updates.capAmount = String(parsed.data.capAmount)
    if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes

    const [updated] = await db
      .update(budgets)
      .set(updates)
      .where(eq(budgets.id, id))
      .returning({ id: budgets.id, name: budgets.name })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.budgets.update",
      entityType: "budget",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/finance/budgets/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ budget: updated })
  }
)

// ── DELETE ────────────────────────────────────────────────────────────────────

export const DELETE = withGates(
  { action: "finance.budgets.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = getBudgetId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.companyId, companyId), isNull(budgets.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(budgets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(budgets.id, id))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.budgets.delete",
      entityType: "budget",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/finance/budgets/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true })
  }
)
