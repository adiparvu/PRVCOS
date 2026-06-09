import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { vehicles, users, stores, auditLogs, vehicleDailyLogs } from "@prv/db/schema"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type MaintenanceStatus = "Done" | "Due Soon" | "Overdue"

export interface MaintenanceRecord {
  id: string
  label: string
  detail: string
  status: MaintenanceStatus
}

export interface ActivityEvent {
  id: string
  time: string
  label: string
  sub: string
  color: string
}

export interface VehicleDetail {
  id: string
  plate: string
  model: string
  year: number
  type: string
  fuel: string
  base: string
  status: string
  driver: string | null
  assignment: string | null
  fuelPct: number
  kmToday: number
  odometer: number
  nextServiceKm: number
  insurance: string
  itp: string
  maintenance: MaintenanceRecord[]
  activity: ActivityEvent[]
}

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
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

function dbStatusToApi(dbStatus: string, hasDriver: boolean): string {
  if (dbStatus === "maintenance") return "Service"
  if (dbStatus === "retired" || dbStatus === "sold") return "Unavailable"
  if (dbStatus === "active" && hasDriver) return "Active"
  return "Idle"
}

function auditToActivityEvent(log: { id: string; action: string; createdAt: Date }): ActivityEvent {
  const label = (() => {
    if (log.action === "fleet.create") return "Vehicul adăugat"
    if (log.action === "fleet.update") return "Vehicul actualizat"
    if (log.action === "fleet.delete") return "Vehicul retras"
    if (log.action.includes("assign")) return "Șofer asignat"
    return log.action
  })()
  const color = log.action.includes("delete")
    ? "#FF453A"
    : log.action.includes("create")
      ? "#30D158"
      : "rgba(255,255,255,0.65)"
  return { id: log.id, time: fmtDate(log.createdAt), label, sub: "—", color }
}

export const GET = withGates(
  { action: "fleet.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const today = new Date().toISOString().split("T")[0]!
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0]!

    const [rows, activityRows, dailyLogRows] = await Promise.all([
      db
        .select({
          id: vehicles.id,
          make: vehicles.make,
          model: vehicles.model,
          year: vehicles.year,
          licensePlate: vehicles.licensePlate,
          vin: vehicles.vin,
          color: vehicles.color,
          fuelType: vehicles.fuelType,
          type: vehicles.type,
          status: vehicles.status,
          mileageKm: vehicles.mileageKm,
          fuelLevelPct: vehicles.fuelLevelPct,
          nextServiceAtKm: vehicles.nextServiceAtKm,
          insuranceExpiresAt: vehicles.insuranceExpiresAt,
          itpExpiresAt: vehicles.itpExpiresAt,
          notes: vehicles.notes,
          assignedFirstName: users.firstName,
          assignedLastName: users.lastName,
          storeName: stores.name,
        })
        .from(vehicles)
        .leftJoin(users, eq(vehicles.assignedUserId, users.id))
        .leftJoin(stores, eq(vehicles.storeId, stores.id))
        .where(
          and(eq(vehicles.id, id), eq(vehicles.companyId, companyId), isNull(vehicles.deletedAt))
        )
        .limit(1),

      db
        .select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.companyId, companyId),
            eq(auditLogs.entityId, id),
            eq(auditLogs.entityType, "vehicle")
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(10),

      db
        .select({ date: vehicleDailyLogs.date, odometerKm: vehicleDailyLogs.odometerKm })
        .from(vehicleDailyLogs)
        .where(
          and(
            eq(vehicleDailyLogs.vehicleId, id),
            inArray(vehicleDailyLogs.date, [today, yesterday])
          )
        ),
    ])

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const driverName = row.assignedFirstName
      ? `${row.assignedFirstName} ${row.assignedLastName}`
      : null
    const apiStatus = dbStatusToApi(row.status, !!driverName)

    const maintenance: MaintenanceRecord[] = []
    if (row.insuranceExpiresAt) {
      const expired = row.insuranceExpiresAt < new Date()
      maintenance.push({
        id: "m-ins",
        label: "Asigurare RCA",
        detail: `${expired ? "Expirată" : "Valabilă"} · ${fmtDate(row.insuranceExpiresAt)}`,
        status: expired ? "Overdue" : "Due Soon",
      })
    }
    if (row.itpExpiresAt) {
      const expired = row.itpExpiresAt < new Date()
      maintenance.push({
        id: "m-itp",
        label: "ITP",
        detail: `${expired ? "Expirat" : "Valabil"} · ${fmtDate(row.itpExpiresAt)}`,
        status: expired ? "Overdue" : "Due Soon",
      })
    }
    if (row.nextServiceAtKm && row.mileageKm) {
      const kmLeft = row.nextServiceAtKm - row.mileageKm
      maintenance.push({
        id: "m-srv",
        label: "Revizie tehnică",
        detail: `La ${row.nextServiceAtKm.toLocaleString()} km · ${kmLeft > 0 ? `~${kmLeft.toLocaleString()} km distanță` : "Restantă"}`,
        status: kmLeft <= 0 ? "Overdue" : kmLeft <= 1000 ? "Due Soon" : "Done",
      })
    }

    const vehicle = {
      id: row.id,
      plate: row.licensePlate,
      model: `${row.make} ${row.model}`,
      year: row.year ?? 0,
      type: dbTypeToLabel(row.type),
      fuel: row.fuelType ?? "—",
      base: row.storeName ?? "—",
      status: apiStatus,
      driver: driverName,
      assignment: driverName ? `Asignat · ${driverName}` : null,
      fuelPct: row.fuelLevelPct ?? 0,
      kmToday: (() => {
        const todayLog = dailyLogRows.find((l) => l.date === today)
        const yesterdayLog = dailyLogRows.find((l) => l.date === yesterday)
        if (todayLog && yesterdayLog)
          return Math.max(0, todayLog.odometerKm - yesterdayLog.odometerKm)
        return 0
      })(),
      odometer: row.mileageKm ?? 0,
      nextServiceKm: row.nextServiceAtKm ?? 0,
      insurance: row.insuranceExpiresAt
        ? `${row.insuranceExpiresAt < new Date() ? "Expirată" : "Valabilă"} · ${fmtDate(row.insuranceExpiresAt)}`
        : "—",
      itp: row.itpExpiresAt
        ? `${row.itpExpiresAt < new Date() ? "Expirat" : "Valabil"} · ${fmtDate(row.itpExpiresAt)}`
        : "—",
      maintenance,
      activity: activityRows.map(auditToActivityEvent),
    }

    return NextResponse.json({ vehicle })
  }
)
