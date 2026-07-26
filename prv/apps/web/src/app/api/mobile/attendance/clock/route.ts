import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { attendanceRecords } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { writeAuditLog } from "@prv/auth"
import { withMobileAuth } from "@/lib/mobile/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Self-service clock-in / clock-out from the phone (offline-queue consumer —
// the mobile client replays this through the durable queue when the job site
// has no signal). Strictly self-scoped: the record is keyed to the session's
// own userId; there is no way to clock someone else.
//
// Lateness is derived from the record's own scheduledStart (already present on
// every attendance row, seeded from the shift default), not re-guessed here:
// clocking in after scheduledStart → status "late" with the minute delta,
// otherwise "present". Managers can still correct via the existing
// /api/attendance/[id] route.

const TZ = "Europe/Bucharest"

function todayStr(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date())
}

/** Minutes after local midnight for a Date, in the business timezone. */
function minutesOfDay(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0)
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  return h * 60 + m
}

function scheduledMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 8) * 60 + (m ?? 0)
}

function extractIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}

const bodySchema = z.object({
  action: z.enum(["in", "out"]),
})

interface ClockResponse {
  id: string
  date: string
  status: string
  clockIn: string | null
  clockOut: string | null
  lateMinutes: number | null
}

function toResponse(row: {
  id: string
  date: string
  status: string
  clockIn: Date | null
  clockOut: Date | null
  lateMinutes: number | null
}): ClockResponse {
  return {
    id: row.id,
    date: row.date,
    status: row.status,
    clockIn: row.clockIn ? row.clockIn.toISOString() : null,
    clockOut: row.clockOut ? row.clockOut.toISOString() : null,
    lateMinutes: row.lateMinutes,
  }
}

// GET — today's own record (or null): the card's data source.
export const GET = withMobileAuth(async (_req, ctx) => {
  const date = todayStr()
  const [row] = await db
    .select({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      clockIn: attendanceRecords.clockIn,
      clockOut: attendanceRecords.clockOut,
      lateMinutes: attendanceRecords.lateMinutes,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.companyId, ctx.companyId),
        eq(attendanceRecords.userId, ctx.userId),
        eq(attendanceRecords.date, date)
      )
    )
    .limit(1)

  return NextResponse.json({ record: row ? toResponse(row) : null, date })
})

export const POST = withMobileAuth(async (req, ctx) => {
  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )
  }
  const { action } = parsed.data
  const now = new Date()
  const date = todayStr()

  const [existing] = await db
    .select({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      clockIn: attendanceRecords.clockIn,
      clockOut: attendanceRecords.clockOut,
      lateMinutes: attendanceRecords.lateMinutes,
      scheduledStart: attendanceRecords.scheduledStart,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.companyId, ctx.companyId),
        eq(attendanceRecords.userId, ctx.userId),
        eq(attendanceRecords.date, date)
      )
    )
    .limit(1)

  if (action === "in") {
    if (existing?.clockIn) {
      return NextResponse.json(
        { error: "Already clocked in today", code: "ALREADY_CLOCKED_IN" },
        { status: 409 }
      )
    }
    if (existing?.status === "leave") {
      // A leave day stays a leave day; clocking in over it needs a manager
      // correction, not a silent overwrite of an approved absence.
      return NextResponse.json(
        { error: "Today is an approved leave day", code: "ON_LEAVE" },
        { status: 409 }
      )
    }

    const scheduled = existing?.scheduledStart ?? "08:00"
    const lateBy = Math.max(0, minutesOfDay(now) - scheduledMinutes(scheduled))
    const status = lateBy > 0 ? ("late" as const) : ("present" as const)
    const lateMinutes = lateBy > 0 ? lateBy : null

    let row
    if (existing) {
      ;[row] = await db
        .update(attendanceRecords)
        .set({ clockIn: now, status, lateMinutes, clockInMethod: "mobile", updatedAt: now })
        .where(eq(attendanceRecords.id, existing.id))
        .returning({
          id: attendanceRecords.id,
          date: attendanceRecords.date,
          status: attendanceRecords.status,
          clockIn: attendanceRecords.clockIn,
          clockOut: attendanceRecords.clockOut,
          lateMinutes: attendanceRecords.lateMinutes,
        })
    } else {
      ;[row] = await db
        .insert(attendanceRecords)
        .values({
          companyId: ctx.companyId,
          userId: ctx.userId,
          date,
          status,
          clockIn: now,
          lateMinutes,
          clockInMethod: "mobile",
        })
        .returning({
          id: attendanceRecords.id,
          date: attendanceRecords.date,
          status: attendanceRecords.status,
          clockIn: attendanceRecords.clockIn,
          clockOut: attendanceRecords.clockOut,
          lateMinutes: attendanceRecords.lateMinutes,
        })
    }

    void writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      sessionId: ctx.sessionId,
      action: "attendance.clock_in",
      entityType: "attendance_record",
      entityId: row!.id,
      method: "POST",
      path: "/api/mobile/attendance/clock",
      ipAddress: extractIp(req),
      userAgent: req.headers.get("user-agent") ?? "",
      payload: { date, status, lateMinutes },
    })

    return NextResponse.json(toResponse(row!), { status: existing ? 200 : 201 })
  }

  // action === "out"
  if (!existing?.clockIn) {
    return NextResponse.json(
      { error: "Not clocked in today", code: "NOT_CLOCKED_IN" },
      { status: 409 }
    )
  }
  if (existing.clockOut) {
    return NextResponse.json(
      { error: "Already clocked out today", code: "ALREADY_CLOCKED_OUT" },
      { status: 409 }
    )
  }

  const [row] = await db
    .update(attendanceRecords)
    .set({ clockOut: now, status: "clocked_out", updatedAt: now })
    .where(eq(attendanceRecords.id, existing.id))
    .returning({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      clockIn: attendanceRecords.clockIn,
      clockOut: attendanceRecords.clockOut,
      lateMinutes: attendanceRecords.lateMinutes,
    })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "attendance.clock_out",
    entityType: "attendance_record",
    entityId: row!.id,
    method: "POST",
    path: "/api/mobile/attendance/clock",
    ipAddress: extractIp(req),
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { date },
  })

  return NextResponse.json(toResponse(row!))
})
