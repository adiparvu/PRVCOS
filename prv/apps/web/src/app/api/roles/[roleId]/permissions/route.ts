import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { roles, permissions, rolePermissions } from "@prv/db/schema"
import { eq, and, or, isNull, inArray } from "drizzle-orm"
import { RoleSets, writeAuditLog, PERMISSION_CATALOG } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/roles/[roleId]/permissions — list permissions assigned to a role
export const GET = withGates(
  {
    action: "roles.permissions.list",
    endpointClass: "api_read",
    requiredRoles: RoleSets.management,
    requiredScope: "SCOPE_COMPANY",
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const roleId = _req.nextUrl.pathname.split("/").at(-2)!

    // Verify role is accessible
    const [role] = await db
      .select({ id: roles.id, slug: roles.slug, type: roles.type })
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          or(isNull(roles.companyId), eq(roles.companyId, ctx.session.companyId))
        )
      )
      .limit(1)

    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 })

    const perms = await db
      .select({ key: permissions.key, module: permissions.module, action: permissions.action })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId))

    return NextResponse.json({ roleId, roleSlug: role.slug, permissions: perms })
  }
)

const patchSchema = z.object({
  permissionKeys: z.array(z.string()).min(1),
  operation: z.enum(["add", "remove", "set"]).default("set"),
})

// PATCH /api/roles/[roleId]/permissions — update permissions for a custom role
export const PATCH = withGates(
  {
    action: "roles.permissions.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const roleId = req.nextUrl.pathname.split("/").at(-2)!

    // Only custom roles can have permissions modified
    const [role] = await db
      .select({ id: roles.id, type: roles.type })
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.type, "custom"),
          eq(roles.companyId, ctx.session.companyId)
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
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { permissionKeys, operation } = parsed.data

    // Validate all keys exist in the catalog
    const validKeys = permissionKeys.filter((k) => k in PERMISSION_CATALOG)

    // Look up permission IDs
    const permRows = await db
      .select({ id: permissions.id, key: permissions.key })
      .from(permissions)
      .where(inArray(permissions.key, validKeys))

    const permMap = new Map(permRows.map((p) => [p.key, p.id]))

    if (operation === "set") {
      // Replace all: delete existing + insert new
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
    }

    if (operation === "set" || operation === "add") {
      const toInsert = validKeys
        .map((k) => permMap.get(k))
        .filter((id): id is string => !!id)
        .map((permId) => ({ roleId, permissionId: permId }))

      if (toInsert.length > 0) {
        await db.insert(rolePermissions).values(toInsert).onConflictDoNothing()
      }
    } else if (operation === "remove") {
      const toRemove = validKeys.map((k) => permMap.get(k)).filter((id): id is string => !!id)

      if (toRemove.length > 0) {
        await db
          .delete(rolePermissions)
          .where(
            and(eq(rolePermissions.roleId, roleId), inArray(rolePermissions.permissionId, toRemove))
          )
      }
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.permissions.update",
      entityType: "role",
      entityId: roleId,
      payload: { operation, permissionKeys: validKeys },
      method: "PATCH",
      path: `/api/roles/${roleId}/permissions`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, operation, updated: validKeys.length })
  }
)
