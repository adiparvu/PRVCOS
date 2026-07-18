import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { maintenanceRecords, vehicleTrips } from "@prv/db/schema"
import { and, eq, gte } from "drizzle-orm"
import { computeMaintenanceAnalytics, type MaintenanceAnalytics } from "@/lib/maintenance-analytics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_DAYS = 90

export type MaintenanceAnalyticsResponse = MaintenanceAnalytics

// GET /api/analytics/maintenance-analytics — maintenance cost (by asset type and
// work type) and trip totals over the last 90 days.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000)

    const [records, trips] = await Promise.all([
      db
        .select({
          assetType: maintenanceRecords.assetType,
          type: maintenanceRecords.type,
          status: maintenanceRecords.status,
          cost: maintenanceRecords.cost,
        })
        .from(maintenanceRecords)
        .where(
          and(eq(maintenanceRecords.companyId, companyId), gte(maintenanceRecords.createdAt, since))
        ),
      db
        .select({
          status: vehicleTrips.status,
          distanceKm: vehicleTrips.distanceKm,
          fuelCost: vehicleTrips.fuelCost,
        })
        .from(vehicleTrips)
        .where(and(eq(vehicleTrips.companyId, companyId), gte(vehicleTrips.startedAt, since))),
    ])

    const analytics = computeMaintenanceAnalytics(
      records.map((r) => ({
        assetType: r.assetType,
        type: r.type,
        status: r.status,
        cost: r.cost != null ? Number(r.cost) : null,
      })),
      trips.map((t) => ({
        status: t.status,
        distanceKm: t.distanceKm,
        fuelCost: t.fuelCost != null ? Number(t.fuelCost) : null,
      }))
    )

    return NextResponse.json(analytics)
  }
)
