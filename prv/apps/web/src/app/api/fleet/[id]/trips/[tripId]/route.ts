import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { vehicles, vehicleTrips } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { tripDistanceKm, isOdometerRangeValid, canTransitionTrip } from "@/lib/trip"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/fleet/[id]/trips/[tripId]
function ids(req: NextRequest): { vehicleId: string; tripId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { tripId: parts.at(-1) ?? "", vehicleId: parts.at(-3) ?? "" }
}

// ── PATCH /api/fleet/[id]/trips/[tripId] ──────────────────────────────────────
// Close an in-progress trip: complete it (with a closing odometer reading and
// optional fuel cost) or cancel it.

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    endOdometerKm: z.number().int().nonnegative(),
    fuelCost: z.number().nonnegative().optional(),
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    action: z.literal("cancel"),
    notes: z.string().max(1000).optional(),
  }),
])

export const PATCH = withGates(
  { action: "fleet.vehicles.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { vehicleId, tripId } = ids(req)
    if (!vehicleId || !tripId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [trip] = await db
      .select({
        id: vehicleTrips.id,
        status: vehicleTrips.status,
        startOdometerKm: vehicleTrips.startOdometerKm,
      })
      .from(vehicleTrips)
      .where(
        and(
          eq(vehicleTrips.id, tripId),
          eq(vehicleTrips.vehicleId, vehicleId),
          eq(vehicleTrips.companyId, companyId)
        )
      )
      .limit(1)
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 })

    const target = parsed.data.action === "complete" ? "completed" : "cancelled"
    if (!canTransitionTrip(trip.status, target)) {
      return NextResponse.json(
        { error: `Cannot ${parsed.data.action} a trip that is ${trip.status}` },
        { status: 409 }
      )
    }

    if (parsed.data.action === "cancel") {
      await db
        .update(vehicleTrips)
        .set({
          status: "cancelled",
          endedAt: new Date(),
          notes: parsed.data.notes,
          updatedAt: new Date(),
        })
        .where(eq(vehicleTrips.id, tripId))

      void writeAuditLog({
        companyId,
        actorId: userId,
        sessionId,
        action: "fleet.trip.cancel",
        entityType: "vehicle_trip",
        entityId: tripId,
        payload: { vehicleId },
        method: "PATCH",
        path: req.nextUrl.pathname,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json({ id: tripId, status: "cancelled" })
    }

    // complete
    const { endOdometerKm, fuelCost, notes } = parsed.data
    if (!isOdometerRangeValid(trip.startOdometerKm, endOdometerKm)) {
      return NextResponse.json(
        { error: "Closing odometer must be ≥ the start reading" },
        { status: 422 }
      )
    }
    const distanceKm = tripDistanceKm(trip.startOdometerKm, endOdometerKm)

    await db
      .update(vehicleTrips)
      .set({
        status: "completed",
        endedAt: new Date(),
        endOdometerKm,
        distanceKm,
        fuelCost: fuelCost !== undefined ? fuelCost.toFixed(2) : null,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(vehicleTrips.id, tripId))

    // Advance vehicle mileage if this closing reading is the highest.
    const [vehicle] = await db
      .select({ mileageKm: vehicles.mileageKm })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.companyId, companyId),
          isNull(vehicles.deletedAt)
        )
      )
      .limit(1)
    if (vehicle && endOdometerKm > (vehicle.mileageKm ?? 0)) {
      await db
        .update(vehicles)
        .set({ mileageKm: endOdometerKm, updatedAt: new Date() })
        .where(eq(vehicles.id, vehicleId))
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "fleet.trip.complete",
      entityType: "vehicle_trip",
      entityId: tripId,
      payload: { vehicleId, endOdometerKm, distanceKm, fuelCost: fuelCost ?? null },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: tripId, status: "completed", distanceKm })
  }
)
