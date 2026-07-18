import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { tools, maintenanceRecords } from "@prv/db/schema"
import { and, count, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { canTransitionMaintenance, assetInMaintenance } from "@/lib/maintenance"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/tools/[id]/maintenance/[recordId]
function ids(req: NextRequest): { toolId: string; recordId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { recordId: parts.at(-1) ?? "", toolId: parts.at(-3) ?? "" }
}

const patchSchema = z.object({
  status: z.enum(["in_progress", "completed", "cancelled"]),
  cost: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
})

export const PATCH = withGates(
  { action: "tools.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { toolId, recordId } = ids(req)
    if (!toolId || !recordId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [record] = await db
      .select({ id: maintenanceRecords.id, status: maintenanceRecords.status })
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.id, recordId),
          eq(maintenanceRecords.assetType, "tool"),
          eq(maintenanceRecords.assetId, toolId),
          eq(maintenanceRecords.companyId, companyId)
        )
      )
      .limit(1)
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 })

    if (!canTransitionMaintenance(record.status, parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot move a ${record.status} record to ${parsed.data.status}` },
        { status: 409 }
      )
    }

    const { status, cost, notes } = parsed.data
    await db
      .update(maintenanceRecords)
      .set({
        status,
        ...(status === "completed" ? { completedAt: new Date() } : {}),
        ...(cost !== undefined ? { cost: cost.toFixed(2) } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRecords.id, recordId))

    const [openRow] = await db
      .select({ n: count() })
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.assetType, "tool"),
          eq(maintenanceRecords.assetId, toolId),
          eq(maintenanceRecords.companyId, companyId),
          inArray(maintenanceRecords.status, ["scheduled", "in_progress"])
        )
      )
    const stillDown = assetInMaintenance(Number(openRow?.n ?? 0))

    // Return the tool to the pool once the last open record clears; never
    // disturb a lost or retired tool.
    if (!stillDown) {
      await db
        .update(tools)
        .set({ status: "available", updatedAt: new Date() })
        .where(
          and(eq(tools.id, toolId), eq(tools.companyId, companyId), eq(tools.status, "maintenance"))
        )
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "tools.maintenance.update",
      entityType: "maintenance_record",
      entityId: recordId,
      payload: { toolId, from: record.status, to: status },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({
      id: recordId,
      status,
      toolStatus: stillDown ? "maintenance" : "available",
    })
  }
)
