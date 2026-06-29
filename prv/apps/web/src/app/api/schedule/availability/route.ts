import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { teamAvailability, users } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const putSchema = z.object({
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  state: z.enum(["yes", "maybe", "no"]),
})

// PUT /api/schedule/availability — upsert a single manual availability override
// for one member on one day. The schedule grid reads these back as overrides on
// top of the shift/leave-derived baseline.
export const PUT = withGates(
  { action: "schedule.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { userId, date, state } = parsed.data

    // Scope check: the target member must belong to the caller's company.
    const [member] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.companyId, companyId)))
      .limit(1)

    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .insert(teamAvailability)
      .values({ companyId, userId, date, state, setByUserId: actorId })
      .onConflictDoUpdate({
        target: [teamAvailability.companyId, teamAvailability.userId, teamAvailability.date],
        set: { state, setByUserId: actorId, updatedAt: new Date() },
      })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "schedule.update",
      entityType: "team_availability",
      entityId: userId,
      payload: { userId, date, state },
      method: "PUT",
      path: "/api/schedule/availability",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true, userId, date, state })
  }
)
