import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { tools, maintenanceRecords, users } from "@prv/db/schema"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { z } from "zod"
import { isOpenMaintenance } from "@/lib/maintenance"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/tools/[id]/maintenance
function toolId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function loadTool(tid: string, companyId: string) {
  const [row] = await db
    .select({ id: tools.id })
    .from(tools)
    .where(and(eq(tools.id, tid), eq(tools.companyId, companyId), isNull(tools.deletedAt)))
    .limit(1)
  return row ?? null
}

// ── GET /api/tools/[id]/maintenance ───────────────────────────────────────────

export const GET = withGates(
  { action: "tools.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const tid = toolId(req)
    const { companyId } = ctx.session

    if (!(await loadTool(tid, companyId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await db
      .select({
        id: maintenanceRecords.id,
        type: maintenanceRecords.type,
        status: maintenanceRecords.status,
        description: maintenanceRecords.description,
        provider: maintenanceRecords.provider,
        cost: maintenanceRecords.cost,
        scheduledDate: maintenanceRecords.scheduledDate,
        completedAt: maintenanceRecords.completedAt,
        notes: maintenanceRecords.notes,
        createdAt: maintenanceRecords.createdAt,
        byFirstName: users.firstName,
        byLastName: users.lastName,
      })
      .from(maintenanceRecords)
      .leftJoin(users, eq(maintenanceRecords.createdById, users.id))
      .where(
        and(
          eq(maintenanceRecords.assetType, "tool"),
          eq(maintenanceRecords.assetId, tid),
          eq(maintenanceRecords.companyId, companyId)
        )
      )
      .orderBy(desc(maintenanceRecords.createdAt))
      .limit(100)

    const records = rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      description: r.description,
      provider: r.provider,
      cost: r.cost ? Number(r.cost) : null,
      scheduledDate: r.scheduledDate,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      notes: r.notes,
      createdBy: r.byFirstName ? `${r.byFirstName} ${r.byLastName}` : null,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ records })
  }
)

// ── POST /api/tools/[id]/maintenance ──────────────────────────────────────────
// Open a maintenance record; an open record takes the tool out of service.

const createSchema = z.object({
  type: z.string().min(1).max(60),
  status: z.enum(["scheduled", "in_progress"]).optional().default("scheduled"),
  description: z.string().max(2000).optional(),
  provider: z.string().max(255).optional(),
  cost: z.number().nonnegative().optional(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  notes: z.string().max(1000).optional(),
})

export const POST = withGates(
  { action: "tools.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const tid = toolId(req)
    const { companyId, userId, sessionId } = ctx.session

    if (!(await loadTool(tid, companyId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }
    const { type, status, description, provider, cost, scheduledDate, notes } = parsed.data

    const [record] = await db
      .insert(maintenanceRecords)
      .values({
        companyId,
        assetType: "tool",
        assetId: tid,
        type,
        status,
        description,
        provider,
        cost: cost !== undefined ? cost.toFixed(2) : null,
        scheduledDate,
        notes,
        createdById: userId,
      })
      .returning({ id: maintenanceRecords.id })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    if (isOpenMaintenance(status)) {
      // Take the tool out of service (and off its holder), leaving lost/retired
      // tools untouched.
      await db
        .update(tools)
        .set({ status: "maintenance", assignedUserId: null, updatedAt: new Date() })
        .where(
          and(
            eq(tools.id, tid),
            eq(tools.companyId, companyId),
            inArray(tools.status, ["available", "in_use", "maintenance"])
          )
        )
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "tools.maintenance.create",
      entityType: "maintenance_record",
      entityId: record.id,
      payload: { toolId: tid, type, status },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id }, { status: 201 })
  }
)
