import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { vehicles, stores } from "@prv/db/schema"
import { users } from "@prv/db/schema"
import { and, asc, eq, gt, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMIT = 50

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
    const cursor = searchParams.get("cursor")

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
      .where(and(eq(vehicles.companyId, ctx.session.companyId), isNull(vehicles.deletedAt), cursor ? gt(vehicles.id, cursor) : undefined))
      .orderBy(asc(vehicles.licensePlate))
      .limit(LIMIT + 1)

    const hasMore = rows.length > LIMIT
    const page = hasMore ? rows.slice(0, LIMIT) : rows
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

    const all: VehicleSummary[] = page.map((r) => {
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

    return NextResponse.json({ vehicles: filtered, count: filtered.length, meta, nextCursor })
  }
)

// ─── POST /api/fleet ──────────────────────────────────────────────────────

const createVehicleSchema = z.object({
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().optional(),
  licensePlate: z.string().min(1).max(20),
  type: z.enum(["car", "van", "truck", "motorcycle", "other"]).optional(),
  fuelType: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  mileageKm: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
})

export const POST = withGates(
  { action: "fleet.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createVehicleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })
    }

    const [record] = await db
      .insert(vehicles)
      .values({ companyId, ...parsed.data })
      .returning({ id: vehicles.id, licensePlate: vehicles.licensePlate })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "fleet.create",
      entityType: "vehicle",
      entityId: record.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/fleet",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, licensePlate: record.licensePlate }, { status: 201 })
  }
)
