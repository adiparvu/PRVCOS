import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { vehicles, stores } from "@prv/db/schema"
import { users } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type VehicleStatus = "Active" | "Idle" | "Service" | "Unavailable"

export interface VehicleSummary {
  id: string
  plate: string
  model: string
  year: number
  type: string
  fuel: string
  base: string
  status: VehicleStatus
  driver: string | null
  assignment: string | null
  fuelPct: number
  kmToday: number
}

export interface FleetMeta {
  total: number
  active: number
  inService: number
  avgFuel: number
  serviceAlert: boolean
}

function dbTypeToLabel(type: string): string {
  const map: Record<string, string> = {
    car: "Car",
    van: "Van",
    truck: "Truck",
    motorcycle: "Motorcycle",
    other: "Other",
  }
  return map[type] ?? type
}

function dbStatusToApi(dbStatus: string, hasDriver: boolean): VehicleStatus {
  if (dbStatus === "maintenance") return "Service"
  if (dbStatus === "retired" || dbStatus === "sold") return "Unavailable"
  // active
  return hasDriver ? "Active" : "Idle"
}

export const GET = withGates(
  { action: "fleet.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") as VehicleStatus | null

    const rows = await db
      .select({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        type: vehicles.type,
        fuelType: vehicles.fuelType,
        status: vehicles.status,
        notes: vehicles.notes,
        driverFirstName: users.firstName,
        driverLastName: users.lastName,
        storeCity: stores.city,
        storeName: stores.name,
      })
      .from(vehicles)
      .leftJoin(users, eq(vehicles.assignedUserId, users.id))
      .leftJoin(stores, eq(vehicles.storeId, stores.id))
      .where(and(eq(vehicles.companyId, ctx.session.companyId), isNull(vehicles.deletedAt)))
      .orderBy(asc(vehicles.licensePlate))

    const all: VehicleSummary[] = rows.map((r) => {
      const driverName =
        r.driverFirstName && r.driverLastName ? `${r.driverFirstName} ${r.driverLastName}` : null
      const apiStatus = dbStatusToApi(r.status, driverName !== null)
      const base = r.storeCity ?? r.storeName ?? "—"
      return {
        id: r.id,
        plate: r.licensePlate,
        model: `${r.make} ${r.model}`.trim(),
        year: r.year ?? 0,
        type: dbTypeToLabel(r.type),
        fuel: r.fuelType ?? "—",
        base,
        status: apiStatus,
        driver: driverName,
        assignment: r.notes ?? null,
        fuelPct: 0,
        kmToday: 0,
      }
    })

    const filtered = statusFilter ? all.filter((v) => v.status === statusFilter) : all

    const activeCount = all.filter((v) => v.status === "Active").length
    const inServiceCount = all.filter((v) => v.status === "Service").length

    const meta: FleetMeta = {
      total: all.length,
      active: activeCount,
      inService: inServiceCount,
      avgFuel: 0,
      serviceAlert: inServiceCount > 0,
    }

    return NextResponse.json({ vehicles: filtered, count: filtered.length, meta })
  }
)
