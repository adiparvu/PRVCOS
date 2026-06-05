import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { roles, rolePermissions, permissions } from "@prv/db/schema"
import { eq, and, or, isNull } from "drizzle-orm"
import { RoleSets } from "@prv/auth"
import type { GateContext } from "@prv/auth"

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
