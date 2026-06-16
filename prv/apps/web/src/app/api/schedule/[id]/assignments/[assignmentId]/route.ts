import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { shiftAssignments, shifts, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { shiftId: parts.at(-3) ?? "", assignmentId: parts.at(-1) ?? "" }
}

// ── DELETE /api/schedule/[id]/assignments/[assignmentId] ─────────────────────

export const DELETE = withGates(
  { action: "schedule.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { shiftId: sid, assignmentId } = ids(req)
    const { companyId, userId: actorId, sessionId } = ctx.session

    const [shift] = await db
      .select({ id: shifts.id, status: shifts.status })
      .from(shifts)
      .where(and(eq(shifts.id, sid), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))
      .limit(1)

    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 })

    const [assignment] = await db
      .select({ id: shiftAssignments.id, userId: shiftAssignments.userId })
      .from(shiftAssignments)
      .where(
        and(eq(shiftAssignments.id, assignmentId), eq(shiftAssignments.shiftId, sid))
      )
      .limit(1)

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

    await db
      .delete(shiftAssignments)
      .where(and(eq(shiftAssignments.id, assignmentId), eq(shiftAssignments.shiftId, sid)))

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "schedule.assignment.delete",
      entityType: "shift_assignment",
      entityId: assignmentId,
      payload: { shiftId: sid, userId: assignment.userId },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
