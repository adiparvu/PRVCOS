import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { payrollItems } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computePayslip } from "@/lib/payslip"
import { recomputeRunTotals } from "@/lib/payroll-recompute"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest): { runId: string; itemId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { runId: parts.at(-3) ?? "", itemId: parts.at(-1) ?? "" }
}
function n(v: string | null): number {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

const patchSchema = z
  .object({
    baseAmount: z.number().min(0).max(100_000_000).optional(),
    overtimeHours: z.number().min(0).max(1000).optional(),
    overtimeAmount: z.number().min(0).max(100_000_000).optional(),
    bonusAmount: z.number().min(0).max(100_000_000).optional(),
    allowanceAmount: z.number().min(0).max(100_000_000).optional(),
    deductionAmount: z.number().min(0).max(100_000_000).optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "payroll.runs.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { runId, itemId } = ids(req)
    if (!runId || !itemId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    // Load current amounts to recompute gross/net after a partial update.
    const [current] = await db
      .select({
        baseAmount: payrollItems.baseAmount,
        overtimeAmount: payrollItems.overtimeAmount,
        bonusAmount: payrollItems.bonusAmount,
        allowanceAmount: payrollItems.allowanceAmount,
        deductionAmount: payrollItems.deductionAmount,
      })
      .from(payrollItems)
      .where(
        and(
          eq(payrollItems.id, itemId),
          eq(payrollItems.runId, runId),
          eq(payrollItems.companyId, companyId)
        )
      )
      .limit(1)
    if (!current) return NextResponse.json({ error: "Line not found" }, { status: 404 })

    const merged = {
      baseAmount: d.baseAmount ?? n(current.baseAmount),
      overtimeAmount: d.overtimeAmount ?? n(current.overtimeAmount),
      bonusAmount: d.bonusAmount ?? n(current.bonusAmount),
      allowanceAmount: d.allowanceAmount ?? n(current.allowanceAmount),
      deductionAmount: d.deductionAmount ?? n(current.deductionAmount),
    }
    const { gross, net } = computePayslip(merged)

    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
      grossAmount: gross.toFixed(2),
      netAmount: net.toFixed(2),
      baseAmount: merged.baseAmount.toFixed(2),
      overtimeAmount: merged.overtimeAmount.toFixed(2),
      bonusAmount: merged.bonusAmount.toFixed(2),
      allowanceAmount: merged.allowanceAmount.toFixed(2),
      deductionAmount: merged.deductionAmount.toFixed(2),
    }
    if (d.overtimeHours !== undefined) patch.overtimeHours = d.overtimeHours.toFixed(2)
    if (d.notes !== undefined) patch.notes = d.notes

    await db
      .update(payrollItems)
      .set(patch)
      .where(
        and(
          eq(payrollItems.id, itemId),
          eq(payrollItems.runId, runId),
          eq(payrollItems.companyId, companyId)
        )
      )

    await recomputeRunTotals(runId, companyId)

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "payroll.item.update",
      entityType: "payroll_item",
      entityId: itemId,
      payload: { runId, gross, net },
      method: "PATCH",
      path: `/api/payroll/${runId}/items/${itemId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: itemId, gross, net })
  }
)

export const DELETE = withGates(
  { action: "payroll.runs.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { runId, itemId } = ids(req)
    if (!runId || !itemId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(payrollItems)
      .where(
        and(
          eq(payrollItems.id, itemId),
          eq(payrollItems.runId, runId),
          eq(payrollItems.companyId, companyId)
        )
      )
      .returning({ id: payrollItems.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Line not found" }, { status: 404 })
    }

    await recomputeRunTotals(runId, companyId)

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "payroll.item.delete",
      entityType: "payroll_item",
      entityId: itemId,
      payload: { runId, itemId },
      method: "DELETE",
      path: `/api/payroll/${runId}/items/${itemId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
