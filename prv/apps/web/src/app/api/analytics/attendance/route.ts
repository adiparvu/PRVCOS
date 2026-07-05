import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { attendanceRecords, users } from "@prv/db/schema"
import { and, eq, gte } from "drizzle-orm"
import {
  computeAttendanceAnalytics,
  type AttendanceAnalytics,
  type AttendanceStatus,
} from "@/lib/attendance-analytics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_DAYS = 30 // trailing window used for the attendance snapshot

export type AttendanceAnalyticsResponse = AttendanceAnalytics & { periodDays: number }

// GET /api/analytics/attendance — workforce-domain BI: aggregates the attendance
// log into attendance/punctuality/absenteeism rates, a status mix, and a
// per-employee watchlist.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId
    const sinceISO = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10)

    const rows = await db
      .select({
        userId: attendanceRecords.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        status: attendanceRecords.status,
        lateMinutes: attendanceRecords.lateMinutes,
      })
      .from(attendanceRecords)
      .leftJoin(users, eq(attendanceRecords.userId, users.id))
      .where(and(eq(attendanceRecords.companyId, companyId), gte(attendanceRecords.date, sinceISO)))

    const analytics = computeAttendanceAnalytics(
      rows.map((r) => ({
        userId: r.userId,
        name: r.firstName ? `${r.firstName} ${r.lastName ?? ""}`.trim() : "Unknown",
        status: r.status as AttendanceStatus,
        lateMinutes: r.lateMinutes,
      }))
    )

    return NextResponse.json({ ...analytics, periodDays: WINDOW_DAYS })
  }
)
