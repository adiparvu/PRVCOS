import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { employmentContracts } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ISO = /^\d{4}-\d{2}-\d{2}$/

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// PATCH supports plain edits plus lifecycle actions: activate, sign, terminate.
const patchSchema = z
  .object({
    action: z.enum(["activate", "sign", "terminate"]).optional(),
    roleTitle: z.string().min(1).max(160).optional(),
    endDate: z.string().regex(ISO).nullable().optional(),
    salaryAmount: z.number().min(0).max(100_000_000).nullable().optional(),
    noticePeriodDays: z.number().int().min(0).max(3650).nullable().optional(),
    terms: z.string().max(20000).nullable().optional(),
    // Termination detail (with action: "terminate").
    terminationReason: z.string().max(5000).nullable().optional(),
    terminationDate: z.string().regex(ISO).nullable().optional(),
    finalWorkingDay: z.string().regex(ISO).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "hr.contracts.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

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

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (d.roleTitle !== undefined) patch.roleTitle = d.roleTitle
    if (d.endDate !== undefined) patch.endDate = d.endDate
    if (d.salaryAmount !== undefined)
      patch.salaryAmount = d.salaryAmount != null ? d.salaryAmount.toFixed(2) : null
    if (d.noticePeriodDays !== undefined) patch.noticePeriodDays = d.noticePeriodDays
    if (d.terms !== undefined) patch.terms = d.terms

    if (d.action === "activate") patch.status = "active"
    if (d.action === "sign") patch.signedAt = new Date()
    if (d.action === "terminate") {
      patch.status = "terminated"
      if (d.terminationReason !== undefined) patch.terminationReason = d.terminationReason
      patch.terminationDate = d.terminationDate ?? new Date().toISOString().slice(0, 10)
      if (d.finalWorkingDay !== undefined) patch.finalWorkingDay = d.finalWorkingDay
    }

    const [updated] = await db
      .update(employmentContracts)
      .set(patch)
      .where(and(eq(employmentContracts.id, rowId), eq(employmentContracts.companyId, companyId)))
      .returning({ id: employmentContracts.id, status: employmentContracts.status })

    if (!updated) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: d.action ? `hr.contracts.${d.action}` : "hr.contracts.update",
      entityType: "employment_contract",
      entityId: rowId,
      payload: { ...d },
      method: "PATCH",
      path: `/api/contracts/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, status: updated.status })
  }
)

// DELETE — only draft contracts can be removed; issued ones are archived via
// terminate/supersede to preserve history.
export const DELETE = withGates(
  { action: "hr.contracts.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(employmentContracts)
      .where(
        and(
          eq(employmentContracts.id, rowId),
          eq(employmentContracts.companyId, companyId),
          eq(employmentContracts.status, "draft")
        )
      )
      .returning({ id: employmentContracts.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Draft contract not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.contracts.delete",
      entityType: "employment_contract",
      entityId: rowId,
      payload: { id: rowId },
      method: "DELETE",
      path: `/api/contracts/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
