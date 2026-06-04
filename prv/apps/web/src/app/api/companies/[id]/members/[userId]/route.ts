import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { companyMemberships } from "@prv/db/schema"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const deactivateSchema = z.object({
  reason: z.string().max(500).optional(),
})

// DELETE /api/companies/[id]/members/[userId] — deactivate a membership (soft delete)
export const DELETE = withGates(
  {
    action: "companies.members.remove",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const segments = req.nextUrl.pathname.split("/")
    const membersIdx = segments.indexOf("members")
    const companyId = membersIdx > 0 ? segments[membersIdx - 1] : undefined
    const targetUserId = membersIdx > 0 ? segments[membersIdx + 1] : undefined

    if (!companyId || !targetUserId) {
      return NextResponse.json({ error: "Missing company id or user id" }, { status: 400 })
    }
    if (companyId !== ctx.session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    // Prevent self-removal
    if (targetUserId === ctx.session.userId) {
      return NextResponse.json(
        { error: "Cannot remove your own membership", code: "SELF_REMOVAL" },
        { status: 422 }
      )
    }

    let reason: string | undefined
    try {
      const body = await req.json().catch(() => ({}))
      const parsed = deactivateSchema.safeParse(body)
      if (parsed.success) reason = parsed.data.reason
    } catch {
      // body is optional on DELETE
    }

    const [membership] = await db
      .update(companyMemberships)
      .set({
        status: "INACTIVE",
        deactivatedAt: new Date(),
        deactivationReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.userId, targetUserId)
        )
      )
      .returning({ id: companyMemberships.id, status: companyMemberships.status })

    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "companies.members.remove",
      entityType: "company_membership",
      entityId: membership.id,
      payload: { targetUserId, reason },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: membership.id, status: membership.status })
  }
)
