import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { shiftSwapRequests, shiftAssignments, shifts, users } from "@prv/db/schema"
import { aliasedTable } from "drizzle-orm"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── GET /api/schedule/swaps — pending (or filtered) swap requests ─────────────

export const GET = withGates(
  { action: "schedule.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const { searchParams } = req.nextUrl
    const shiftFilter = searchParams.get("shiftId")
    const statusFilter = searchParams.get("status")

    const requester = aliasedTable(users, "requester")
    const target = aliasedTable(users, "target_user")

    const conditions = [eq(shiftSwapRequests.companyId, companyId)]
    if (shiftFilter) conditions.push(eq(shiftSwapRequests.shiftId, shiftFilter))
    if (statusFilter === "pending" || statusFilter === "approved" || statusFilter === "rejected")
      conditions.push(eq(shiftSwapRequests.status, statusFilter))

    const rows = await db
      .select({
        id: shiftSwapRequests.id,
        shiftId: shiftSwapRequests.shiftId,
        status: shiftSwapRequests.status,
        note: shiftSwapRequests.note,
        requesterId: shiftSwapRequests.requesterId,
        createdAt: shiftSwapRequests.createdAt,
        shiftTitle: shifts.title,
        shiftDate: shifts.date,
        requesterFirst: requester.firstName,
        requesterLast: requester.lastName,
        targetFirst: target.firstName,
        targetLast: target.lastName,
      })
      .from(shiftSwapRequests)
      .leftJoin(shifts, eq(shiftSwapRequests.shiftId, shifts.id))
      .leftJoin(requester, eq(shiftSwapRequests.requesterId, requester.id))
      .leftJoin(target, eq(shiftSwapRequests.targetUserId, target.id))
      .where(and(...conditions))
      .orderBy(desc(shiftSwapRequests.createdAt))
      .limit(100)

    const swaps = rows.map((r) => ({
      id: r.id,
      shiftId: r.shiftId,
      status: r.status,
      note: r.note,
      requesterId: r.requesterId,
      shift: r.shiftTitle ? `${r.shiftTitle} · ${r.shiftDate}` : null,
      requester: r.requesterFirst ? `${r.requesterFirst} ${r.requesterLast}` : null,
      target: r.targetFirst ? `${r.targetFirst} ${r.targetLast}` : null,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ swaps })
  }
)

// ── POST /api/schedule/swaps — a worker requests a swap for their shift ───────

const createSchema = z.object({
  shiftId: z.string().uuid(),
  targetUserId: z.string().uuid().optional(),
  note: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "schedule.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }
    const { shiftId, targetUserId, note } = parsed.data

    const [shift] = await db
      .select({ id: shifts.id })
      .from(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId), isNull(shifts.deletedAt)))
      .limit(1)
    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 })

    // The requester must be assigned to the shift they want to swap.
    const [mine] = await db
      .select({ id: shiftAssignments.id })
      .from(shiftAssignments)
      .where(and(eq(shiftAssignments.shiftId, shiftId), eq(shiftAssignments.userId, userId)))
      .limit(1)
    if (!mine)
      return NextResponse.json({ error: "You are not assigned to this shift" }, { status: 403 })

    if (targetUserId) {
      const [member] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, targetUserId), eq(users.companyId, companyId)))
        .limit(1)
      if (!member) return NextResponse.json({ error: "Target employee not found" }, { status: 404 })
      const [already] = await db
        .select({ id: shiftAssignments.id })
        .from(shiftAssignments)
        .where(
          and(eq(shiftAssignments.shiftId, shiftId), eq(shiftAssignments.userId, targetUserId))
        )
        .limit(1)
      if (already)
        return NextResponse.json(
          { error: "Target is already assigned to this shift" },
          { status: 409 }
        )
    }

    const [swap] = await db
      .insert(shiftSwapRequests)
      .values({
        companyId,
        shiftId,
        requesterId: userId,
        targetUserId: targetUserId ?? null,
        note,
      })
      .returning({ id: shiftSwapRequests.id })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "schedule.swap.request",
      entityType: "shift_swap_request",
      entityId: swap?.id ?? shiftId,
      payload: { shiftId, targetUserId: targetUserId ?? null },
      method: "POST",
      path: "/api/schedule/swaps",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: swap?.id }, { status: 201 })
  }
)
