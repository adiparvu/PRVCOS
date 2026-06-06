import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { temporaryAccessGrants } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import { invalidatePermissionCache } from "@prv/auth/permission-engine"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// DELETE /api/roles/grants/[grantId] — revoke an active temporary access grant
export const DELETE = withGates(
  {
    action: "roles.grants.revoke",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireReauth: true,
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const grantId = _req.nextUrl.pathname.split("/").at(-1)!

    const [grant] = await db
      .select({ userId: temporaryAccessGrants.userId, status: temporaryAccessGrants.status })
      .from(temporaryAccessGrants)
      .where(
        and(
          eq(temporaryAccessGrants.id, grantId),
          eq(temporaryAccessGrants.companyId, ctx.session.companyId),
          eq(temporaryAccessGrants.status, "active")
        )
      )
      .limit(1)

    if (!grant) {
      return NextResponse.json({ error: "Active grant not found" }, { status: 404 })
    }

    await db
      .update(temporaryAccessGrants)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revokedBy: ctx.session.userId,
        updatedAt: new Date(),
      })
      .where(eq(temporaryAccessGrants.id, grantId))

    await invalidatePermissionCache(grant.userId, ctx.session.companyId)

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.grants.revoke",
      entityType: "temporary_access_grant",
      entityId: grantId,
      method: "DELETE",
      path: `/api/roles/grants/${grantId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true })
  }
)
