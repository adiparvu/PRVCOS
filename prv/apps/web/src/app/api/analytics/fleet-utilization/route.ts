import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { vehicleDailyLogs, vehicles } from "@prv/db/schema"
import { and, eq, gte } from "drizzle-orm"
import { computeFleetUtilization, type FleetUtilization } from "@/lib/fleet-utilization"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_DAYS = 30

export type FleetUtilizationResponse = FleetUtilization

// GET /api/analytics/fleet-utilization — fleet usage from the last 30 days of
// daily odometer logs: per-vehicle km driven and fleet totals.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sinceStr = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)

    const rows = await db
      .select({
        vehicleId: vehicleDailyLogs.vehicleId,
        date: vehicleDailyLogs.date,
        odometerKm: vehicleDailyLogs.odometerKm,
        make: vehicles.make,
        model: vehicles.model,
        licensePlate: vehicles.licensePlate,
      })
      .from(vehicleDailyLogs)
      .leftJoin(vehicles, eq(vehicleDailyLogs.vehicleId, vehicles.id))
      .where(
        and(
          eq(vehicleDailyLogs.companyId, ctx.session.companyId),
          gte(vehicleDailyLogs.date, sinceStr)
        )
      )

    const utilization = computeFleetUtilization(
      rows.map((r) => ({
        vehicleId: r.vehicleId,
        label: r.make ? `${r.make} ${r.model} · ${r.licensePlate}` : "Unknown vehicle",
        date: String(r.date),
        odometerKm: r.odometerKm,
      })),
      WINDOW_DAYS
    )

    return NextResponse.json(utilization)
  }
)
