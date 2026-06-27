import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { leaveRequests } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ─── GET /api/workforce/leave ─────────────────────────────────────────────────

export const GET = withGates(
  { action: "workforce.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const sp = req.nextUrl.searchParams
    const userId = sp.get("userId")
    const status = sp.get("status")

    const conditions = [eq(leaveRequests.companyId, companyId), isNull(leaveRequests.deletedAt)]
    if (userId) conditions.push(eq(leaveRequests.userId, userId))
    if (status && ["pending", "approved", "rejected"].includes(status))
      conditions.push(eq(leaveRequests.status, status as "pending" | "approved" | "rejected"))

    const rows = await db
      .select()
      .from(leaveRequests)
      .where(and(...conditions))
      .orderBy(asc(leaveRequests.startDate))

    return NextResponse.json({ leaveRequests: rows })
  }
)

// ─── POST /api/workforce/leave ────────────────────────────────────────────────

const postSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["annual", "medical", "unpaid", "other"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().max(255).optional(),
  notes: z.string().optional(),
})

export const POST = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [row] = await db
      .insert(leaveRequests)
      .values({
        companyId,
        userId: parsed.data.userId,
        type: parsed.data.type ?? "annual",
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        label: parsed.data.label ?? null,
        notes: parsed.data.notes ?? null,
      })
      .returning({ id: leaveRequests.id })

    if (!row) {
      return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.write",
      entityType: "leave_request",
      entityId: row.id,
      payload: {
        userId: parsed.data.userId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: row.id }, { status: 201 })
  }
)
