import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { userRoleAssignments } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import { invalidatePermissionCache } from "@prv/auth/permission-engine"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// DELETE /api/roles/assignments/[assignmentId] — revoke a role assignment
export const DELETE = withGates(
  {
    action: "roles.revoke",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireReauth: true,
  },
  async (
    _req: NextRequest,
    ctx: GateContext,
    { params }: { params: Promise<{ assignmentId: string }> }
  ): Promise<NextResponse> => {
    const { assignmentId } = await params

    const [assignment] = await db
      .select({ userId: userRoleAssignments.userId, companyId: userRoleAssignments.companyId })
      .from(userRoleAssignments)
      .where(
        and(
          eq(userRoleAssignments.id, assignmentId),
          eq(userRoleAssignments.companyId, ctx.session.companyId),
          eq(userRoleAssignments.isActive, true)
        )
      )
      .limit(1)

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    await db
      .update(userRoleAssignments)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy: ctx.session.userId,
        updatedAt: new Date(),
      })
      .where(eq(userRoleAssignments.id, assignmentId))

    await invalidatePermissionCache(assignment.userId, ctx.session.companyId)

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.revoke",
      entityType: "role_assignment",
      entityId: assignmentId,
      method: "DELETE",
      path: `/api/roles/assignments/${assignmentId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true })
  }
)
