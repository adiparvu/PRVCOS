import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { vehicles, maintenanceRecords, users } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { isOpenMaintenance } from "@/lib/maintenance"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/fleet/[id]/maintenance
function vehicleId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function loadVehicle(vid: string, companyId: string) {
  const [row] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.id, vid), eq(vehicles.companyId, companyId), isNull(vehicles.deletedAt)))
    .limit(1)
  return row ?? null
}

// ── GET /api/fleet/[id]/maintenance ───────────────────────────────────────────

export const GET = withGates(
  { action: "fleet.vehicles.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const vid = vehicleId(req)
    const { companyId } = ctx.session

    if (!(await loadVehicle(vid, companyId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await db
      .select({
        id: maintenanceRecords.id,
        type: maintenanceRecords.type,
        status: maintenanceRecords.status,
        description: maintenanceRecords.description,
        provider: maintenanceRecords.provider,
        cost: maintenanceRecords.cost,
        odometerKm: maintenanceRecords.odometerKm,
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
          eq(maintenanceRecords.assetType, "vehicle"),
          eq(maintenanceRecords.assetId, vid),
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
      odometerKm: r.odometerKm,
      scheduledDate: r.scheduledDate,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      notes: r.notes,
      createdBy: r.byFirstName ? `${r.byFirstName} ${r.byLastName}` : null,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ records })
  }
)

// ── POST /api/fleet/[id]/maintenance ──────────────────────────────────────────
// Open a maintenance record; an open record takes the vehicle out of service.

const createSchema = z.object({
  type: z.string().min(1).max(60),
  status: z.enum(["scheduled", "in_progress"]).optional().default("scheduled"),
  description: z.string().max(2000).optional(),
  provider: z.string().max(255).optional(),
  cost: z.number().nonnegative().optional(),
  odometerKm: z.number().int().nonnegative().optional(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional(),
  notes: z.string().max(1000).optional(),
})

export const POST = withGates(
  { action: "fleet.vehicles.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const vid = vehicleId(req)
    const { companyId, userId, sessionId } = ctx.session

    if (!(await loadVehicle(vid, companyId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }
    const { type, status, description, provider, cost, odometerKm, scheduledDate, notes } =
      parsed.data

    const [record] = await db
      .insert(maintenanceRecords)
      .values({
        companyId,
        assetType: "vehicle",
        assetId: vid,
        type,
        status,
        description,
        provider,
        cost: cost !== undefined ? cost.toFixed(2) : null,
        odometerKm,
        scheduledDate,
        notes,
        createdById: userId,
      })
      .returning({ id: maintenanceRecords.id })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    if (isOpenMaintenance(status)) {
      await db
        .update(vehicles)
        .set({ status: "maintenance", updatedAt: new Date() })
        .where(and(eq(vehicles.id, vid), eq(vehicles.companyId, companyId)))
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "fleet.maintenance.create",
      entityType: "maintenance_record",
      entityId: record.id,
      payload: { vehicleId: vid, type, status },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id }, { status: 201 })
  }
)
