import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { equipmentAssignments } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CONDITIONS = ["new", "good", "fair", "poor", "damaged"] as const
const STATUSES = ["assigned", "returned", "lost"] as const
const ISO = /^\d{4}-\d{2}-\d{2}$/

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

const patchSchema = z
  .object({
    equipmentType: z.string().min(1).max(80).optional(),
    label: z.string().max(160).nullable().optional(),
    serialNumber: z.string().max(120).nullable().optional(),
    expectedReturnDate: z.string().regex(ISO).nullable().optional(),
    returnedDate: z.string().regex(ISO).nullable().optional(),
    condition: z.enum(CONDITIONS).optional(),
    returnCondition: z.enum(CONDITIONS).nullable().optional(),
    status: z.enum(STATUSES).optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
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
    for (const k of [
      "equipmentType",
      "label",
      "serialNumber",
      "expectedReturnDate",
      "returnedDate",
      "condition",
      "returnCondition",
      "status",
      "notes",
    ] as const) {
      if (d[k] !== undefined) patch[k] = d[k]
    }

    // Convenience: marking as returned stamps the return date if none supplied.
    if (d.status === "returned" && d.returnedDate === undefined) {
      patch.returnedDate = new Date().toISOString().slice(0, 10)
    }

    const [updated] = await db
      .update(equipmentAssignments)
      .set(patch)
      .where(and(eq(equipmentAssignments.id, rowId), eq(equipmentAssignments.companyId, companyId)))
      .returning({ id: equipmentAssignments.id, status: equipmentAssignments.status })

    if (!updated) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.equipment.update",
      entityType: "equipment_assignment",
      entityId: rowId,
      payload: { ...d },
      method: "PATCH",
      path: `/api/workforce/equipment/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, status: updated.status })
  }
)

export const DELETE = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(equipmentAssignments)
      .where(and(eq(equipmentAssignments.id, rowId), eq(equipmentAssignments.companyId, companyId)))
      .returning({ id: equipmentAssignments.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.equipment.delete",
      entityType: "equipment_assignment",
      entityId: rowId,
      payload: { id: rowId },
      method: "DELETE",
      path: `/api/workforce/equipment/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
