import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { roles } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getRoleId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1)!
}

// ─── PATCH /api/roles/[roleId] — update a custom role's name/description ─────

const patchRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  defaultScopeLevel: z
    .enum([
      "SCOPE_RECORD",
      "SCOPE_TEAM",
      "SCOPE_DEPARTMENT",
      "SCOPE_STORE",
      "SCOPE_REGION",
      "SCOPE_COMPANY",
    ])
    .optional(),
})

export const PATCH = withGates(
  {
    action: "roles.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const roleId = getRoleId(req)

    // Only custom roles within the company can be modified
    const [role] = await db
      .select({ id: roles.id, type: roles.type })
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.type, "custom"),
          eq(roles.companyId, ctx.session.companyId),
          eq(roles.isActive, true)
        )
      )
      .limit(1)

    if (!role) {
      return NextResponse.json(
        { error: "Role not found or system roles cannot be modified" },
        { status: 404 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const [updated] = await db
      .update(roles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(roles.id, roleId))
      .returning({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        description: roles.description,
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.update",
      entityType: "role",
      entityId: roleId,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/roles/${roleId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/roles/[roleId] — soft-delete a custom role ──────────────────

export const DELETE = withGates(
  {
    action: "roles.delete",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const roleId = getRoleId(req)

    // System roles are immutable — only custom roles within the company can be deleted
    const [role] = await db
      .select({ id: roles.id, name: roles.name, type: roles.type })
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.type, "custom"),
          eq(roles.companyId, ctx.session.companyId),
          eq(roles.isActive, true)
        )
      )
      .limit(1)

    if (!role) {
      return NextResponse.json(
        { error: "Role not found or system roles cannot be deleted" },
        { status: 404 }
      )
    }

    await db
      .update(roles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(roles.id, roleId))

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.delete",
      entityType: "role",
      entityId: roleId,
      payload: { name: role.name },
      method: "DELETE",
      path: `/api/roles/${roleId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
