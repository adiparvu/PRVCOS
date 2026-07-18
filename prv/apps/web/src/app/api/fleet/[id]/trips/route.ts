import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { vehicles, vehicleTrips, users, projects } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/fleet/[id]/trips
function vehicleId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function loadVehicle(vid: string, companyId: string) {
  const [row] = await db
    .select({ id: vehicles.id, mileageKm: vehicles.mileageKm })
    .from(vehicles)
    .where(and(eq(vehicles.id, vid), eq(vehicles.companyId, companyId), isNull(vehicles.deletedAt)))
    .limit(1)
  return row ?? null
}

// ── GET /api/fleet/[id]/trips ─────────────────────────────────────────────────

export const GET = withGates(
  { action: "fleet.vehicles.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const vid = vehicleId(req)
    const { companyId } = ctx.session

    const vehicle = await loadVehicle(vid, companyId)
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10), 100)

    const rows = await db
      .select({
        id: vehicleTrips.id,
        status: vehicleTrips.status,
        purpose: vehicleTrips.purpose,
        startOdometerKm: vehicleTrips.startOdometerKm,
        endOdometerKm: vehicleTrips.endOdometerKm,
        distanceKm: vehicleTrips.distanceKm,
        fuelCost: vehicleTrips.fuelCost,
        startedAt: vehicleTrips.startedAt,
        endedAt: vehicleTrips.endedAt,
        notes: vehicleTrips.notes,
        driverFirstName: users.firstName,
        driverLastName: users.lastName,
        projectName: projects.name,
      })
      .from(vehicleTrips)
      .leftJoin(users, eq(vehicleTrips.driverId, users.id))
      .leftJoin(projects, eq(vehicleTrips.projectId, projects.id))
      .where(and(eq(vehicleTrips.vehicleId, vid), eq(vehicleTrips.companyId, companyId)))
      .orderBy(desc(vehicleTrips.startedAt))
      .limit(limit)

    const trips = rows.map((r) => ({
      id: r.id,
      status: r.status,
      purpose: r.purpose,
      driver: r.driverFirstName ? `${r.driverFirstName} ${r.driverLastName}` : null,
      project: r.projectName ?? null,
      startOdometerKm: r.startOdometerKm,
      endOdometerKm: r.endOdometerKm,
      distanceKm: r.distanceKm,
      fuelCost: r.fuelCost ? Number(r.fuelCost) : null,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
      notes: r.notes,
    }))

    const active = trips.find((t) => t.status === "in_progress") ?? null
    return NextResponse.json({ trips, active })
  }
)

// ── POST /api/fleet/[id]/trips ────────────────────────────────────────────────
// Start a trip. A vehicle can only have one trip in progress at a time.

const startSchema = z.object({
  driverId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  purpose: z.string().max(255).optional(),
  startOdometerKm: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
})

export const POST = withGates(
  { action: "fleet.vehicles.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const vid = vehicleId(req)
    const { companyId, userId, sessionId } = ctx.session

    const vehicle = await loadVehicle(vid, companyId)
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const raw = await req.json().catch(() => ({}))
    const parsed = startSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [openTrip] = await db
      .select({ id: vehicleTrips.id })
      .from(vehicleTrips)
      .where(
        and(
          eq(vehicleTrips.vehicleId, vid),
          eq(vehicleTrips.companyId, companyId),
          eq(vehicleTrips.status, "in_progress")
        )
      )
      .limit(1)
    if (openTrip) {
      return NextResponse.json({ error: "Vehicle already has a trip in progress" }, { status: 409 })
    }

    const { driverId, projectId, purpose, notes } = parsed.data
    const startOdometerKm = parsed.data.startOdometerKm ?? vehicle.mileageKm ?? 0

    const [trip] = await db
      .insert(vehicleTrips)
      .values({
        companyId,
        vehicleId: vid,
        driverId: driverId ?? null,
        projectId: projectId ?? null,
        purpose,
        status: "in_progress",
        startOdometerKm,
        notes,
      })
      .returning({ id: vehicleTrips.id })

    if (!trip) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    if (startOdometerKm > (vehicle.mileageKm ?? 0)) {
      await db
        .update(vehicles)
        .set({ mileageKm: startOdometerKm, updatedAt: new Date() })
        .where(eq(vehicles.id, vid))
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "fleet.trip.start",
      entityType: "vehicle_trip",
      entityId: trip.id,
      payload: { vehicleId: vid, driverId: driverId ?? null, startOdometerKm },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: trip.id }, { status: 201 })
  }
)
