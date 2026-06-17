import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { leaveRequests, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { inngest } from "@prv/jobs/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function leaveId(req: NextRequest) {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

async function resolveLeave(id: string, companyId: string) {
  const [row] = await db
    .select()
    .from(leaveRequests)
    .where(
      and(eq(leaveRequests.id, id), eq(leaveRequests.companyId, companyId), isNull(leaveRequests.deletedAt))
    )
    .limit(1)
  return row ?? null
}

// ─── GET /api/workforce/leave/[id] ────────────────────────────────────────────

export const GET = withGates(
  { action: "workforce.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const leave = await resolveLeave(leaveId(req), ctx.session.companyId)
    if (!leave) return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    return NextResponse.json({ leaveRequest: leave })
  }
)

// ─── PATCH /api/workforce/leave/[id] ─────────────────────────────────────────
// Approve or reject a pending leave request.

const patchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().optional(),
})

export const PATCH = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = leaveId(req)
    const { companyId, userId: actorId, sessionId } = ctx.session

    const leave = await resolveLeave(id, companyId)
    if (!leave) return NextResponse.json({ error: "Leave request not found" }, { status: 404 })

    if (leave.status !== "pending")
      return NextResponse.json(
        { error: `Cannot change status of a ${leave.status} leave request` },
        { status: 409 }
      )

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })

    await db
      .update(leaveRequests)
      .set({
        status: parsed.data.status,
        approvedByUserId: actorId,
        notes: parsed.data.notes ?? leave.notes,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id))

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.write",
      entityType: "leave_request",
      entityId: id,
      payload: { status: parsed.data.status, userId: leave.userId },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    const [approver] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1)

    const approverName = approver
      ? [approver.firstName, approver.lastName].filter(Boolean).join(" ") || approver.email
      : "Your manager"

    void inngest.send({
      name: "prv/leave.status_changed",
      data: {
        leaveId: id,
        userId: leave.userId,
        companyId,
        decision: parsed.data.status as "approved" | "rejected",
        leaveType: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        approverName,
        notes: parsed.data.notes ?? leave.notes ?? undefined,
      },
    })

    return NextResponse.json({ id, status: parsed.data.status })
  }
)

// ─── DELETE /api/workforce/leave/[id] ────────────────────────────────────────
// Cancel (soft-delete) a pending leave request.

export const DELETE = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = leaveId(req)
    const { companyId, userId: actorId, sessionId } = ctx.session

    const leave = await resolveLeave(id, companyId)
    if (!leave) return NextResponse.json({ error: "Leave request not found" }, { status: 404 })

    if (leave.status === "approved")
      return NextResponse.json(
        { error: "Cannot cancel an already approved leave request" },
        { status: 409 }
      )

    await db
      .update(leaveRequests)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.write",
      entityType: "leave_request",
      entityId: id,
      payload: { cancelled: true, userId: leave.userId },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
