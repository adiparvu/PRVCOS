import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and, isNull } from "drizzle-orm"
import { db } from "@prv/db"
import { attendanceRecords, shifts, shiftAssignments, stores } from "@prv/db/schema"
import type { GateContext } from "@prv/auth"

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
