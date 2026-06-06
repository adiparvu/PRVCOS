import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { roles, rolePermissions, permissions } from "@prv/db/schema"
import { eq, and, or, isNull } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/roles — list all roles visible to the authenticated company
// Returns system roles (company_id IS NULL) + company's own custom roles
export const GET = withGates(
  {
    action: "roles.list",
    endpointClass: "api_read",
    requiredRoles: RoleSets.management,
    requiredScope: "SCOPE_COMPANY",
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        description: roles.description,
        type: roles.type,
        defaultScopeLevel: roles.defaultScopeLevel,
        isActive: roles.isActive,
      })
      .from(roles)
      .where(
        and(
          eq(roles.isActive, true),
          or(isNull(roles.companyId), eq(roles.companyId, ctx.session.companyId))
        )
      )
      .orderBy(roles.type, roles.name)

    return NextResponse.json({ roles: rows })
  }
)

// ─── POST /api/roles — create a custom role for the authenticated company ─────

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9-_]+$/,
      "Slug may only contain lowercase letters, numbers, hyphens and underscores"
    ),
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
    .default("SCOPE_RECORD"),
})

export const POST = withGates(
  {
    action: "roles.create",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // Slug must be unique within the company
    const [conflict] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.slug, parsed.data.slug), eq(roles.companyId, ctx.session.companyId)))
      .limit(1)

    if (conflict) {
      return NextResponse.json(
        { error: "A role with this slug already exists", code: "SLUG_CONFLICT" },
        { status: 409 }
      )
    }

    const [role] = await db
      .insert(roles)
      .values({
        companyId: ctx.session.companyId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        type: "custom",
        defaultScopeLevel: parsed.data.defaultScopeLevel,
        isActive: true,
      })
      .returning({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        type: roles.type,
        defaultScopeLevel: roles.defaultScopeLevel,
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "roles.create",
      entityType: "role",
      entityId: role!.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/roles",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(role, { status: 201 })
  }
)
