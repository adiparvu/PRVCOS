import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { attendanceRecords, shifts, shiftAssignments, stores } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { resolveClockAction, lateMinutes, isGpsVerified, clockInStatus } from "@/lib/clock"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TZ = "Europe/Bucharest"

function todayStr(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
}

export interface LiveShiftResponse {
  hasShift: boolean
  scheduledStart: string | null
  scheduledEnd: string | null
  clockIn: string | null
  clockOut: string | null
  location: string | null
  status: string | null
}

// GET /api/me/shift — today's shift state for the calling user
export const GET = withGates(
  { action: "attendance.clock", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session
    const today = todayStr()

    // Try attendance record first (it has clock-in/out and scheduled times)
    const [record] = await db
      .select({
        scheduledStart: attendanceRecords.scheduledStart,
        scheduledEnd: attendanceRecords.scheduledEnd,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        status: attendanceRecords.status,
        storeId: attendanceRecords.storeId,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.companyId, companyId),
          eq(attendanceRecords.date, today)
        )
      )
      .limit(1)

    if (record) {
      let location: string | null = null
      if (record.storeId) {
        const [storeRow] = await db
          .select({ name: stores.name })
          .from(stores)
          .where(eq(stores.id, record.storeId))
          .limit(1)
        location = storeRow?.name ?? null
      }

      const data: LiveShiftResponse = {
        hasShift: true,
        scheduledStart: record.scheduledStart,
        scheduledEnd: record.scheduledEnd,
        clockIn: record.clockIn?.toISOString() ?? null,
        clockOut: record.clockOut?.toISOString() ?? null,
        location,
        status: record.status,
      }
      return NextResponse.json(data)
    }

    // Fall back to scheduled shift assignment for today
    const [assignment] = await db
      .select({
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        location: shifts.location,
        storeId: shifts.storeId,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(shiftAssignments.userId, userId),
          eq(shiftAssignments.companyId, companyId),
          eq(shifts.date, today),
          isNull(shifts.deletedAt)
        )
      )
      .limit(1)

    if (assignment) {
      let location = assignment.location ?? null
      if (!location && assignment.storeId) {
        const [storeRow] = await db
          .select({ name: stores.name })
          .from(stores)
          .where(eq(stores.id, assignment.storeId))
          .limit(1)
        location = storeRow?.name ?? null
      }

      const data: LiveShiftResponse = {
        hasShift: true,
        scheduledStart: assignment.startTime,
        scheduledEnd: assignment.endTime,
        clockIn: null,
        clockOut: null,
        location,
        status: "scheduled",
      }
      return NextResponse.json(data)
    }

    return NextResponse.json({
      hasShift: false,
      scheduledStart: null,
      scheduledEnd: null,
      clockIn: null,
      clockOut: null,
      location: null,
      status: null,
    } satisfies LiveShiftResponse)
  }
)

// ── POST /api/me/shift — worker clock-in / clock-out with GPS capture ─────────

function nowLocalHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date())
}

const clockBodySchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().nonnegative().optional(),
  method: z.enum(["web", "mobile", "kiosk"]).optional(),
})

export const POST = withGates(
  { action: "attendance.clock", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId, sessionId } = ctx.session
    const today = todayStr()

    const raw = await req.json().catch(() => ({}))
    const parsed = clockBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }
    const { lat, lng, accuracy, method } = parsed.data

    const [record] = await db
      .select({
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        scheduledStart: attendanceRecords.scheduledStart,
        storeId: attendanceRecords.storeId,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.companyId, companyId),
          eq(attendanceRecords.date, today)
        )
      )
      .limit(1)

    const action = resolveClockAction(
      record ? { clockIn: record.clockIn, clockOut: record.clockOut } : null
    )
    if (action === "done") {
      return NextResponse.json({ error: "Already clocked out today" }, { status: 409 })
    }

    const now = new Date()
    const latVal = lat !== undefined ? String(lat) : null
    const lngVal = lng !== undefined ? String(lng) : null
    const accVal = accuracy !== undefined ? Math.round(accuracy) : null
    const gps = isGpsVerified(lat ?? null, lng ?? null, accVal)

    if (action === "clock_in") {
      let scheduledStart = record?.scheduledStart ?? null
      let scheduledEnd = "17:00"
      let storeId = record?.storeId ?? null
      if (!scheduledStart) {
        const [asg] = await db
          .select({ startTime: shifts.startTime, endTime: shifts.endTime, storeId: shifts.storeId })
          .from(shiftAssignments)
          .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
          .where(
            and(
              eq(shiftAssignments.userId, userId),
              eq(shiftAssignments.companyId, companyId),
              eq(shifts.date, today),
              isNull(shifts.deletedAt)
            )
          )
          .limit(1)
        scheduledStart = asg?.startTime ?? "08:00"
        scheduledEnd = asg?.endTime ?? "17:00"
        storeId = storeId ?? asg?.storeId ?? null
      }

      const late = lateMinutes(scheduledStart, nowLocalHHMM())
      const status = clockInStatus(late)

      await db
        .insert(attendanceRecords)
        .values({
          companyId,
          userId,
          date: today,
          scheduledStart,
          scheduledEnd,
          storeId,
          status,
          clockIn: now,
          lateMinutes: late,
          gpsVerified: gps,
          locationLat: latVal,
          locationLng: lngVal,
          locationAccuracyM: accVal,
          clockInMethod: method ?? "web",
        })
        .onConflictDoUpdate({
          target: [attendanceRecords.userId, attendanceRecords.date],
          set: {
            status,
            clockIn: now,
            lateMinutes: late,
            gpsVerified: gps,
            locationLat: latVal,
            locationLng: lngVal,
            locationAccuracyM: accVal,
            clockInMethod: method ?? "web",
            updatedAt: now,
          },
        })

      void writeAuditLog({
        companyId,
        actorId: userId,
        sessionId,
        action: "attendance.clock_in",
        entityType: "attendance_record",
        entityId: userId,
        payload: { date: today, lateMinutes: late, gpsVerified: gps, method: method ?? "web" },
        method: "POST",
        path: "/api/me/shift",
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json({
        action,
        clockIn: now.toISOString(),
        status,
        lateMinutes: late,
        gpsVerified: gps,
      })
    }

    // clock_out
    await db
      .update(attendanceRecords)
      .set({
        clockOut: now,
        status: "clocked_out",
        ...(latVal !== null
          ? { locationLat: latVal, locationLng: lngVal, locationAccuracyM: accVal }
          : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.companyId, companyId),
          eq(attendanceRecords.date, today)
        )
      )

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "attendance.clock_out",
      entityType: "attendance_record",
      entityId: userId,
      payload: { date: today, gpsVerified: gps },
      method: "POST",
      path: "/api/me/shift",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ action, clockOut: now.toISOString(), status: "clocked_out" })
  }
)
