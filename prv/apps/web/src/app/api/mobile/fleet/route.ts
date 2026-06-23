import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { vehicles, users, stores, vehicleDailyLogs } from "@prv/db/schema"
import { and, asc, eq, inArray, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type VehicleStatus = "Active" | "Service" | "Idle" | "Unavailable"

function dbStatusToMobile(dbStatus: string, hasDriver: boolean): VehicleStatus {
  if (dbStatus === "maintenance") return "Service"
  if (dbStatus === "retired" || dbStatus === "sold") return "Unavailable"
  return hasDriver ? "Active" : "Idle"
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status") as VehicleStatus | null

  const rows = await db
    .select({
      id: vehicles.id,
      licensePlate: vehicles.licensePlate,
      make: vehicles.make,
      model: vehicles.model,
      type: vehicles.type,
      status: vehicles.status,
      notes: vehicles.notes,
      fuelLevelPct: vehicles.fuelLevelPct,
      driverFirstName: users.firstName,
      driverLastName: users.lastName,
      storeCity: stores.city,
      storeName: stores.name,
    })
    .from(vehicles)
    .leftJoin(users, eq(vehicles.assignedUserId, users.id))
    .leftJoin(stores, eq(vehicles.storeId, stores.id))
    .where(and(eq(vehicles.companyId, ctx.companyId), isNull(vehicles.deletedAt)))
    .orderBy(asc(vehicles.licensePlate))
    .limit(50)

  const today = new Date().toISOString().split("T")[0]!
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0]!
  const vehicleIds = rows.map((r) => r.id)

  const dailyLogRows =
    vehicleIds.length > 0
      ? await db
          .select({
            vehicleId: vehicleDailyLogs.vehicleId,
            date: vehicleDailyLogs.date,
            odometerKm: vehicleDailyLogs.odometerKm,
          })
          .from(vehicleDailyLogs)
          .where(
            and(
              inArray(vehicleDailyLogs.vehicleId, vehicleIds),
              inArray(vehicleDailyLogs.date, [today, yesterday])
            )
          )
      : []

  const odometerMap = new Map<string, { today?: number; yesterday?: number }>()
  for (const log of dailyLogRows) {
    if (!odometerMap.has(log.vehicleId)) odometerMap.set(log.vehicleId, {})
    const entry = odometerMap.get(log.vehicleId)!
    if (log.date === today) entry.today = log.odometerKm
    else if (log.date === yesterday) entry.yesterday = log.odometerKm
  }

  const all = rows.map((r) => {
    const driverName =
      r.driverFirstName && r.driverLastName ? `${r.driverFirstName} ${r.driverLastName}` : null
    const status = dbStatusToMobile(r.status, driverName !== null)
    const entry = odometerMap.get(r.id)
    const kmToday =
      entry?.today !== undefined && entry?.yesterday !== undefined
        ? Math.max(0, entry.today - entry.yesterday)
        : 0
    return {
      id: r.id,
      plateNumber: r.licensePlate,
      model: `${r.make} ${r.model}`.trim(),
      type: r.type as string,
      status,
      assignment: driverName ?? r.notes ?? null,
      site: r.storeCity ?? r.storeName ?? null,
      fuelPct: r.fuelLevelPct ?? null,
      kmToday,
    }
  })

  const filtered = statusFilter ? all.filter((v) => v.status === statusFilter) : all

  const meta = {
    total: all.length,
    active: all.filter((v) => v.status === "Active").length,
    inService: all.filter((v) => v.status === "Service").length,
    idle: all.filter((v) => v.status === "Idle").length,
  }

  return NextResponse.json({ meta, vehicles: filtered })
})
