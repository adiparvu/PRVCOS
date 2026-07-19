import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { shiftSwapRequests, shiftAssignments, shifts } from "@prv/db/schema"
import { and, eq, isNull, ne } from "drizzle-orm"
import { z } from "zod"
import { canDecideSwap, swapDecisionStatus } from "@/lib/swap"
import { findConflict } from "@/lib/shift-overlap"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function swapId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

const patchSchema = z.object({ decision: z.enum(["approve", "reject"]) })

// ── PATCH /api/schedule/swaps/[id] — a team leader approves or rejects ────────
export const PATCH = withGates(
  { action: "schedule.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = swapId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    const [swap] = await db
      .select({
        id: shiftSwapRequests.id,
        status: shiftSwapRequests.status,
        shiftId: shiftSwapRequests.shiftId,
        requesterId: shiftSwapRequests.requesterId,
        targetUserId: shiftSwapRequests.targetUserId,
      })
      .from(shiftSwapRequests)
      .where(and(eq(shiftSwapRequests.id, id), eq(shiftSwapRequests.companyId, companyId)))
      .limit(1)
    if (!swap) return NextResponse.json({ error: "Swap not found" }, { status: 404 })
    if (!canDecideSwap(swap.status))
      return NextResponse.json({ error: `Swap is already ${swap.status}` }, { status: 409 })

    const now = new Date()

    if (parsed.data.decision === "approve") {
      const [shift] = await db
        .select({
          id: shifts.id,
          date: shifts.date,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
        })
        .from(shifts)
        .where(and(eq(shifts.id, swap.shiftId), isNull(shifts.deletedAt)))
        .limit(1)
      if (!shift) return NextResponse.json({ error: "Shift no longer exists" }, { status: 409 })

      // If a target is named, make sure they aren't double-booked before moving.
      if (swap.targetUserId) {
        const sameDay = await db
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
              eq(shiftAssignments.userId, swap.targetUserId),
              eq(shifts.companyId, companyId),
              eq(shifts.date, shift.date),
              ne(shifts.id, shift.id),
              isNull(shifts.deletedAt)
            )
          )
        if (findConflict(shift.startTime, shift.endTime, sameDay))
          return NextResponse.json(
            { error: "Target is double-booked at that time", code: "SHIFT_CONFLICT" },
            { status: 409 }
          )
      }

      // Move the shift: drop the requester, add the target (if any).
      await db
        .delete(shiftAssignments)
        .where(
          and(
            eq(shiftAssignments.shiftId, swap.shiftId),
            eq(shiftAssignments.userId, swap.requesterId)
          )
        )
      if (swap.targetUserId) {
        await db
          .insert(shiftAssignments)
          .values({ shiftId: swap.shiftId, userId: swap.targetUserId, companyId })
          .onConflictDoNothing()
      }
    }

    await db
      .update(shiftSwapRequests)
      .set({
        status: swapDecisionStatus(parsed.data.decision),
        decidedById: userId,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(shiftSwapRequests.id, id))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: `schedule.swap.${parsed.data.decision}`,
      entityType: "shift_swap_request",
      entityId: id,
      payload: { shiftId: swap.shiftId, decision: parsed.data.decision },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id, status: swapDecisionStatus(parsed.data.decision) })
  }
)
