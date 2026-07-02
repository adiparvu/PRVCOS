import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { shiftAssignments, shifts, users } from "@prv/db/schema"
import { and, asc, count, eq, isNull, ne } from "drizzle-orm"
import { findConflict } from "@/lib/shift-overlap"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function shiftId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return parts.at(-2) ?? ""
}

async function resolveShift(id: string, companyId: string) {
  const [shift] = await db
    .select()
    .from(shifts)
    .where(and(eq(shifts.id, id), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))
    .limit(1)
  return shift ?? null
}

// ── GET /api/schedule/[id]/assignments ────────────────────────────────────────

export const GET = withGates(
  { action: "schedule.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const sid = shiftId(req)

    if (!(await resolveShift(sid, companyId)))
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })

    const rows = await db
      .select({
        id: shiftAssignments.id,
        userId: shiftAssignments.userId,
        createdAt: shiftAssignments.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(shiftAssignments)
      .leftJoin(users, eq(users.id, shiftAssignments.userId))
      .where(eq(shiftAssignments.shiftId, sid))
      .orderBy(asc(users.lastName), asc(users.firstName))

    return NextResponse.json({ assignments: rows })
  }
)

// ── POST /api/schedule/[id]/assignments ───────────────────────────────────────

const createSchema = z.object({
  userId: z.string().uuid(),
})

export const POST = withGates(
  { action: "schedule.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session
    const sid = shiftId(req)

    const shift = await resolveShift(sid, companyId)
    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 })

    if ((shift.status as string) === "cancelled" || (shift.status as string) === "done")
      return NextResponse.json(
        { error: `Cannot assign workers to a ${shift.status} shift` },
        { status: 409 }
      )

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    // Verify user belongs to this company
    const [member] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, parsed.data.userId), eq(users.companyId, companyId)))
      .limit(1)

    if (!member) return NextResponse.json({ error: "User not found in company" }, { status: 404 })

    // Check slot capacity
    const [countRow] = await db
      .select({ cnt: count() })
      .from(shiftAssignments)
      .where(eq(shiftAssignments.shiftId, sid))

    if (shift.totalSlots !== null && (countRow?.cnt ?? 0) >= shift.totalSlots)
      return NextResponse.json({ error: "Shift is already at full capacity" }, { status: 409 })

    // Conflict detection: the employee's other shifts on the same date must not
    // overlap this one's time window (double-booking).
    const sameDayShifts = await db
      .select({
        id: shifts.id,
        title: shifts.title,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(shiftAssignments)
      .innerJoin(shifts, eq(shiftAssignments.shiftId, shifts.id))
      .where(
        and(
          eq(shiftAssignments.userId, parsed.data.userId),
          eq(shifts.companyId, companyId),
          eq(shifts.date, shift.date),
          ne(shifts.id, sid),
          isNull(shifts.deletedAt)
        )
      )

    const conflict = findConflict(shift.startTime, shift.endTime, sameDayShifts)
    if (conflict)
      return NextResponse.json(
        {
          error: `Double-booked: overlaps "${conflict.title ?? "another shift"}" (${conflict.startTime}\u2013${conflict.endTime})`,
          code: "SHIFT_CONFLICT",
          conflict,
        },
        { status: 409 }
      )

    const [assignment] = await db
      .insert(shiftAssignments)
      .values({ shiftId: sid, userId: parsed.data.userId, companyId })
      .onConflictDoNothing()
      .returning({ id: shiftAssignments.id })

    if (!assignment)
      return NextResponse.json({ error: "User is already assigned to this shift" }, { status: 409 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "schedule.assignment.create",
      entityType: "shift_assignment",
      entityId: assignment.id,
      payload: { shiftId: sid, userId: parsed.data.userId },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(assignment, { status: 201 })
  }
)
