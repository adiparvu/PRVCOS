import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { vehicles, vehicleDailyLogs } from "@prv/db/schema"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function vehicleId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

// ── GET /api/fleet/[id]/logs ──────────────────────────────────────────────────

export const GET = withGates(
  { action: "fleet.vehicles.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const vid = vehicleId(req)
    const { companyId } = ctx.session
    const { searchParams } = req.nextUrl
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100)

    const [vehicle] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(
        and(eq(vehicles.id, vid), eq(vehicles.companyId, companyId), isNull(vehicles.deletedAt))
      )
      .limit(1)

    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const conditions = [
      eq(vehicleDailyLogs.vehicleId, vid),
      eq(vehicleDailyLogs.companyId, companyId),
    ]
    if (cursor) conditions.push(lt(vehicleDailyLogs.date, cursor))

    const logs = await db
      .select({
        id: vehicleDailyLogs.id,
        date: vehicleDailyLogs.date,
        odometerKm: vehicleDailyLogs.odometerKm,
        recordedBy: vehicleDailyLogs.recordedBy,
        createdAt: vehicleDailyLogs.createdAt,
      })
      .from(vehicleDailyLogs)
      .where(and(...conditions))
      .orderBy(desc(vehicleDailyLogs.date))
      .limit(limit + 1)

    const hasMore = logs.length > limit
    const data = hasMore ? logs.slice(0, limit) : logs
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.date : null

    return NextResponse.json({ logs: data, nextCursor })
  }
)

// ── POST /api/fleet/[id]/logs ─────────────────────────────────────────────────

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  odometerKm: z.number().int().nonnegative(),
})

export const POST = withGates(
  { action: "fleet.vehicles.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const vid = vehicleId(req)
    const { companyId, userId, sessionId } = ctx.session

    const [vehicle] = await db
      .select({ id: vehicles.id, mileageKm: vehicles.mileageKm })
      .from(vehicles)
      .where(
        and(eq(vehicles.id, vid), eq(vehicles.companyId, companyId), isNull(vehicles.deletedAt))
      )
      .limit(1)

    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { date, odometerKm } = parsed.data

    if (odometerKm < (vehicle.mileageKm ?? 0)) {
      return NextResponse.json(
        { error: "Odometer reading must be ≥ current vehicle mileage" },
        { status: 422 }
      )
    }

    const [log] = await db
      .insert(vehicleDailyLogs)
      .values({ vehicleId: vid, companyId, date, odometerKm, recordedBy: userId })
      .onConflictDoUpdate({
        target: [vehicleDailyLogs.vehicleId, vehicleDailyLogs.date],
        set: { odometerKm, recordedBy: userId, updatedAt: new Date() },
      })
      .returning({ id: vehicleDailyLogs.id, date: vehicleDailyLogs.date })

    // Advance vehicle mileage if this is the highest reading
    if (odometerKm > (vehicle.mileageKm ?? 0)) {
      await db
        .update(vehicles)
        .set({ mileageKm: odometerKm, updatedAt: new Date() })
        .where(eq(vehicles.id, vid))
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "fleet.vehicle.log_odometer",
      entityType: "vehicle_daily_log",
      entityId: log!.id,
      payload: parsed.data,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(log, { status: 201 })
  }
)
