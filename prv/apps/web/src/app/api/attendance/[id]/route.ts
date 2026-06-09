import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { attendanceRecords, users, stores } from "@prv/db/schema"
import { and, eq, gte, lte } from "drizzle-orm"
import { z } from "zod"
import type { AttendanceStatus } from "../route"

function hhmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ClockEvent {
  id: string
  time: string
  label: string
  sub: string | null
  done: boolean
  color: string
}

export interface WeekDay {
  label: string
  minutes: number
  barPct: number
  isToday: boolean
}

export interface AttendanceDetail {
  id: string
  employeeId: string
  initials: string
  name: string
  role: string
  site: string
  status: AttendanceStatus
  clockIn: string | null
  clockOut: string | null
  activeMinutes: number | null
  lateMinutes: number | null
  scheduledStart: string | null
  scheduledEnd: string | null
  leaveLabel: null
  gpsVerified: boolean | null
  barPct: number
  device: null
  overtime: number
  weekTotalMinutes: number
  weekDays: WeekDay[]
  timeline: ClockEvent[]
  approvedBy: null
}

const DAY_LABELS = ["D", "L", "Ma", "Mi", "J", "V", "S"] as const

export const GET = withGates(
  { action: "attendance.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const rows = await db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        date: attendanceRecords.date,
        status: attendanceRecords.status,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        lateMinutes: attendanceRecords.lateMinutes,
        gpsVerified: attendanceRecords.gpsVerified,
        scheduledStart: attendanceRecords.scheduledStart,
        scheduledEnd: attendanceRecords.scheduledEnd,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        storeName: stores.name,
      })
      .from(attendanceRecords)
      .leftJoin(users, eq(attendanceRecords.userId, users.id))
      .leftJoin(stores, eq(attendanceRecords.storeId, stores.id))
      .where(and(eq(attendanceRecords.id, id), eq(attendanceRecords.companyId, companyId)))
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const name = row.firstName ? `${row.firstName} ${row.lastName}` : "—"
    const initials = row.firstName ? `${row.firstName[0]}${row.lastName![0]}` : "?"

    const clockInStr = row.clockIn
      ? row.clockIn.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
      : null
    const clockOutStr = row.clockOut
      ? row.clockOut.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
      : null

    const activeMinutes =
      row.clockIn && row.clockOut
        ? Math.round((row.clockOut.getTime() - row.clockIn.getTime()) / 60_000)
        : row.clockIn
          ? Math.round((Date.now() - row.clockIn.getTime()) / 60_000)
          : null

    const maxMinutes = 540
    const barPct = activeMinutes ? Math.min(100, Math.round((activeMinutes / maxMinutes) * 100)) : 0

    // Fetch this week's attendance for the user
    const today = new Date()
    const mon = new Date(today)
    mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const monStr = mon.toISOString().slice(0, 10)
    const sunStr = new Date(mon.getTime() + 6 * 86_400_000).toISOString().slice(0, 10)

    const weekRows = await db
      .select({
        date: attendanceRecords.date,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, row.userId),
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.date, monStr),
          lte(attendanceRecords.date, sunStr)
        )
      )

    const weekDays: WeekDay[] = ["L", "Ma", "Mi", "J", "V", "S", "D"].map((label, i) => {
      const dayDate = new Date(mon.getTime() + i * 86_400_000)
      const dayStr = dayDate.toISOString().slice(0, 10)
      const dayRow = weekRows.find((r) => r.date === dayStr)
      let minutes = 0
      if (dayRow?.clockIn && dayRow?.clockOut) {
        minutes = Math.round((dayRow.clockOut.getTime() - dayRow.clockIn.getTime()) / 60_000)
      } else if (dayRow?.clockIn) {
        minutes = Math.round((Date.now() - dayRow.clockIn.getTime()) / 60_000)
      }
      return {
        label,
        minutes,
        barPct: Math.min(100, Math.round((minutes / maxMinutes) * 100)),
        isToday: dayStr === today.toISOString().slice(0, 10),
      }
    })

    const weekTotalMinutes = weekDays.reduce((s, d) => s + d.minutes, 0)

    const timeline: ClockEvent[] = []
    if (row.clockIn) {
      timeline.push({
        id: "c1",
        time: clockInStr!,
        label: "Clock In",
        sub: `${row.storeName ?? "—"} · GPS ${row.gpsVerified ? "verificat" : "neverificat"}${row.lateMinutes ? ` · +${row.lateMinutes} min întârziere` : ""}`,
        done: true,
        color: row.lateMinutes ? "rgba(255,159,10,.8)" : "rgba(48,209,88,.8)",
      })
    }
    if (row.clockOut) {
      timeline.push({
        id: "c-out",
        time: clockOutStr!,
        label: "Clock Out",
        sub: activeMinutes
          ? `Tură finalizată · ${Math.floor(activeMinutes / 60)}h ${activeMinutes % 60}m total`
          : null,
        done: true,
        color: "rgba(48,209,88,.8)",
      })
    } else if (row.clockIn) {
      timeline.push({
        id: "c-pending",
        time: "—",
        label: "Clock Out",
        sub: "Tură activă",
        done: false,
        color: "rgba(255,255,255,.15)",
      })
    } else {
      timeline.push({
        id: "c-absent",
        time: "—",
        label: "Nicio activitate înregistrată",
        sub: row.status === "leave" ? "În concediu" : "Absență nemotivată",
        done: false,
        color: row.status === "leave" ? "rgba(10,132,255,.5)" : "rgba(255,69,58,.5)",
      })
    }

    const record = {
      id: row.id,
      employeeId: row.userId,
      initials,
      name,
      role: row.jobTitle ?? "—",
      site: row.storeName ?? "—",
      status: row.status,
      clockIn: clockInStr,
      clockOut: clockOutStr,
      activeMinutes,
      lateMinutes: row.lateMinutes,
      scheduledStart: row.scheduledStart,
      scheduledEnd: row.scheduledEnd,
      leaveLabel: null,
      gpsVerified: row.gpsVerified,
      barPct,
      device: null,
      overtime: (() => {
        if (activeMinutes === null) return 0
        const scheduled = hhmToMinutes(row.scheduledEnd) - hhmToMinutes(row.scheduledStart)
        return Math.max(0, activeMinutes - scheduled)
      })(),
      weekTotalMinutes,
      weekDays,
      timeline,
      approvedBy: null,
    }

    return NextResponse.json({ record })
  }
)

// ─── PATCH /api/attendance/[id] ───────────────────────────────────────────────

const attendancePatchSchema = z
  .object({
    status: z.enum(["present", "late", "absent", "leave", "clocked_out"]).optional(),
    clockIn: z.string().datetime({ offset: true }).nullable().optional(),
    clockOut: z.string().datetime({ offset: true }).nullable().optional(),
    lateMinutes: z.number().int().min(0).max(720).nullable().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "At least one field is required",
  })

export const PATCH = withGates(
  { action: "attendance.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = attendancePatchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.id, id), eq(attendanceRecords.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { status, clockIn, clockOut, lateMinutes } = parsed.data

    const [updated] = await db
      .update(attendanceRecords)
      .set({
        ...(status !== undefined && { status }),
        ...(clockIn !== undefined && { clockIn: clockIn ? new Date(clockIn) : null }),
        ...(clockOut !== undefined && { clockOut: clockOut ? new Date(clockOut) : null }),
        ...(lateMinutes !== undefined && { lateMinutes }),
      })
      .where(and(eq(attendanceRecords.id, id), eq(attendanceRecords.companyId, companyId)))
      .returning({ id: attendanceRecords.id, status: attendanceRecords.status })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "attendance.update",
      entityType: "attendance_record",
      entityId: id,
      payload: { userId: existing.userId, from: existing.status, changes: parsed.data },
      method: "PATCH",
      path: `/api/attendance/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
