import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { roles, userRoleAssignments } from "@prv/db/schema"
import { eq, and, or, isNull } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import { invalidatePermissionCache } from "@prv/auth/permission-engine"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const assignSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
})

// POST /api/roles/assign — assign a role to a user within the current company
export const POST = withGates(
  {
    action: "roles.assign",
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

    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { userId, roleId, reason } = parsed.data

    // Validate the role is accessible for this company
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

    if (!role) {
      return NextResponse.json({ error: "Role not found or not accessible" }, { status: 404 })
    }

    // Upsert: reactivate if previously revoked, else insert
    const existing = await db
      .select({ id: userRoleAssignments.id })
      .from(userRoleAssignments)
      .where(
        and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.companyId, ctx.session.companyId),
          eq(userRoleAssignments.roleId, roleId)
        )
      )
      .limit(1)

    let assignmentId: string
    if (existing[0]) {
      await db
        .update(userRoleAssignments)
        .set({ isActive: true, revokedAt: null, revokedBy: null, updatedAt: new Date() })
        .where(eq(userRoleAssignments.id, existing[0].id))
      assignmentId = existing[0].id
    } else {
      const [inserted] = await db
        .insert(userRoleAssignments)
        .values({
          userId,
          companyId: ctx.session.companyId,
          roleId,
          assignedBy: ctx.session.userId,
          reason,
        })
        .returning({ id: userRoleAssignments.id })
      assignmentId = inserted!.id
    }

    await invalidatePermissionCache(userId, ctx.session.companyId)

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.assign",
      entityType: "role_assignment",
      entityId: assignmentId,
      payload: { userId, roleId, roleSlug: role.slug, reason },
      method: "POST",
      path: "/api/roles/assign",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ assignmentId, roleSlug: role.slug }, { status: 201 })
  }
)
