import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { attendanceRecords, leaveRequests, users, stores } from "@prv/db/schema"
import { and, eq, gt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMIT = 50

export type AttendanceStatus = "present" | "late" | "absent" | "leave" | "clocked_out"

export interface AttendanceRecord {
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
  scheduledStart: string
  scheduledEnd: string
  leaveLabel: string | null
  gpsVerified: boolean
  barPct: number
}

export interface AttendanceMeta {
  present: number
  late: number
  absent: number
  onLeave: number
  dateLabel: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TZ = "Europe/Bucharest"
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function todayStr(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
}

function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z")
  return `${DAY_LABELS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_LABELS[d.getUTCMonth()]}`
}

function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

function computeActiveMinutes(clockIn: Date | null, clockOut: Date | null): number | null {
  if (!clockIn) return null
  return Math.floor(((clockOut ?? new Date()).getTime() - clockIn.getTime()) / 60_000)
}

function computeBarPct(
  activeMinutes: number | null,
  scheduledStart: string,
  scheduledEnd: string
): number {
  if (!activeMinutes) return 0
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }
  const scheduled = toMin(scheduledEnd) - toMin(scheduledStart)
  if (scheduled <= 0) return 0
  return Math.min(100, Math.round((activeMinutes / scheduled) * 100))
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "attendance.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const statusFilter = searchParams.get("status") as AttendanceStatus | null
    const dateParam = searchParams.get("date") ?? todayStr()
    const cursor = searchParams.get("cursor")

    const rows = await db
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        status: attendanceRecords.status,
        scheduledStart: attendanceRecords.scheduledStart,
        scheduledEnd: attendanceRecords.scheduledEnd,
        clockIn: attendanceRecords.clockIn,
        clockOut: attendanceRecords.clockOut,
        lateMinutes: attendanceRecords.lateMinutes,
        gpsVerified: attendanceRecords.gpsVerified,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        storeName: stores.name,
        leaveLabel: leaveRequests.label,
      })
      .from(attendanceRecords)
      .innerJoin(users, eq(attendanceRecords.userId, users.id))
      .leftJoin(stores, eq(attendanceRecords.storeId, stores.id))
      .leftJoin(leaveRequests, eq(attendanceRecords.leaveRequestId, leaveRequests.id))
      .where(
        and(
          eq(attendanceRecords.companyId, ctx.session.companyId),
          eq(attendanceRecords.date, dateParam),
          cursor ? gt(attendanceRecords.id, cursor) : undefined
        )
      )
      .limit(LIMIT + 1)

    const hasMore = rows.length > LIMIT
    const page = hasMore ? rows.slice(0, LIMIT) : rows
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

    const all: AttendanceRecord[] = page.map((r) => {
      const activeMinutes = computeActiveMinutes(r.clockIn, r.clockOut)
      return {
        id: r.id,
        employeeId: r.userId,
        initials: ((r.firstName[0] ?? "") + (r.lastName[0] ?? "")).toUpperCase(),
        name: `${r.firstName} ${r.lastName}`,
        role: r.jobTitle ?? "—",
        site: r.storeName ?? "—",
        status: r.status as AttendanceStatus,
        clockIn: r.clockIn ? fmtTime(r.clockIn) : null,
        clockOut: r.clockOut ? fmtTime(r.clockOut) : null,
        activeMinutes,
        lateMinutes: r.lateMinutes ?? null,
        scheduledStart: r.scheduledStart,
        scheduledEnd: r.scheduledEnd,
        leaveLabel: r.leaveLabel ?? null,
        gpsVerified: r.gpsVerified,
        barPct: computeBarPct(activeMinutes, r.scheduledStart, r.scheduledEnd),
      }
    })

    const filtered = statusFilter ? all.filter((r) => r.status === statusFilter) : all

    const meta: AttendanceMeta = {
      present: all.filter((r) => r.status === "present" || r.status === "clocked_out").length,
      late: all.filter((r) => r.status === "late").length,
      absent: all.filter((r) => r.status === "absent").length,
      onLeave: all.filter((r) => r.status === "leave").length,
      dateLabel: fmtDateLabel(dateParam),
    }

    return NextResponse.json({ records: filtered, count: filtered.length, meta, nextCursor })
  }
)

// ─── POST /api/attendance ──────────────────────────────────────────────────────

const createAttendanceSchema = z.object({
  userId: z.string().uuid(),
  date: z.string().min(1),
  status: z.enum(["present", "late", "absent", "leave", "clocked_out"]).optional(),
  scheduledStart: z.string().max(5).optional(),
  scheduledEnd: z.string().max(5).optional(),
})

export const POST = withGates(
  { action: "attendance.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createAttendanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // Idempotent create: (userId, date) is unique, so a repeat mark is a no-op
    // rather than a 500 — and it never clobbers existing clock-in/late data.
    const [record] = await db
      .insert(attendanceRecords)
      .values({ companyId, ...parsed.data })
      .onConflictDoNothing()
      .returning({ id: attendanceRecords.id })

    if (!record) return NextResponse.json({ existed: true }, { status: 200 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "attendance.create",
      entityType: "attendance",
      entityId: record.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/attendance",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id }, { status: 201 })
  }
)
