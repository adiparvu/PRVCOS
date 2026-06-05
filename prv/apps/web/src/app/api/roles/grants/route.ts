import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { roles, temporaryAccessGrants } from "@prv/db/schema"
import { eq, and, or, isNull } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import { invalidatePermissionCache } from "@prv/auth/permission-engine"
import { inngest } from "@prv/jobs"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const grantSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  reason: z.string().min(10).max(500),
  durationMinutes: z.number().int().min(15).max(1440), // 15min – 24h
  grantedPermissions: z.array(z.string()).optional().default([]),
})

// POST /api/roles/grants — create a temporary access grant
export const POST = withGates(
  {
    action: "roles.grants.create",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = grantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { userId, roleId, reason, durationMinutes, grantedPermissions } = parsed.data

    // Validate role
    const [role] = await db
      .select({ id: roles.id, slug: roles.slug })
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.isActive, true),
          or(isNull(roles.companyId), eq(roles.companyId, ctx.session.companyId))
        )
      )
      .limit(1)

    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000)

    const [grant] = await db
      .insert(temporaryAccessGrants)
      .values({
        userId,
        companyId: ctx.session.companyId,
        grantedRoleId: roleId,
        grantedPermissions,
        reason,
        grantedBy: ctx.session.userId,
        status: "active",
        startsAt: now,
        expiresAt,
      })
      .returning({ id: temporaryAccessGrants.id })

    const grantId = grant!.id

    // Schedule auto-expiry job
    const { ids } = await inngest.send({
      name: "prv/grant.issued",
      data: { grantId, expiresAt: expiresAt.toISOString() },
    })

    // Store the Inngest job ID so it can be cancelled on early revocation
    await db
      .update(temporaryAccessGrants)
      .set({ inngestJobId: ids[0] ?? null })
      .where(eq(temporaryAccessGrants.id, grantId))

    await invalidatePermissionCache(userId, ctx.session.companyId)

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.grants.create",
      entityType: "temporary_access_grant",
      entityId: grantId,
      payload: { userId, roleId: role.slug, durationMinutes, reason },
      method: "POST",
      path: "/api/roles/grants",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ grantId, expiresAt }, { status: 201 })
  }
)
