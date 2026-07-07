import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { vehicles } from "@prv/db/schema"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { computeFleetReadiness, type FleetReadiness } from "@/lib/fleet-readiness"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type FleetReadinessResponse = FleetReadiness

// GET /api/analytics/fleet-readiness — operating-fleet readiness: service due,
// insurance/ITP expiry, maintenance and fuel, per vehicle and rolled up.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        licensePlate: vehicles.licensePlate,
        status: vehicles.status,
        mileageKm: vehicles.mileageKm,
        nextServiceAtKm: vehicles.nextServiceAtKm,
        fuelLevelPct: vehicles.fuelLevelPct,
        insuranceExpiresAt: vehicles.insuranceExpiresAt,
        itpExpiresAt: vehicles.itpExpiresAt,
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.companyId, ctx.session.companyId),
          isNull(vehicles.deletedAt),
          inArray(vehicles.status, ["active", "maintenance"])
        )
      )

    const readiness = computeFleetReadiness(
      rows.map((r) => ({
        id: r.id,
        label: `${r.make} ${r.model} · ${r.licensePlate}`,
        status: r.status as string,
        mileageKm: r.mileageKm,
        nextServiceAtKm: r.nextServiceAtKm,
        fuelLevelPct: r.fuelLevelPct,
        insuranceExpiresAt: r.insuranceExpiresAt ? r.insuranceExpiresAt.toISOString() : null,
        itpExpiresAt: r.itpExpiresAt ? r.itpExpiresAt.toISOString() : null,
      })),
      Date.now()
    )

    return NextResponse.json(readiness)
  }
)
