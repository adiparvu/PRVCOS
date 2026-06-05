import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { companyGroups, groupMemberships, companies } from "@prv/db/schema"
import { eq, and, count } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import { resolveVisibleCompanyIds } from "@prv/auth/scope-resolver"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET /api/groups — list groups visible to the session
// Group CEO: groups their company belongs to
// System Admin: all groups
export const GET = withGates(
  {
    action: "groups.list",
    endpointClass: "api_read",
    requiredRoles: new Set(["group_ceo", "ceo", "system_administrator"] as const),
    requiredScope: "SCOPE_GROUP",
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // For group-scope users: groups that contain their company
    const myMemberships = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.companyId, ctx.session.companyId),
          eq(groupMemberships.isActive, true)
        )
      )

    const groupIds = myMemberships.map((m) => m.groupId)

    if (groupIds.length === 0) {
      return NextResponse.json({ groups: [] })
    }

    const rows = await db
      .select({
        id: companyGroups.id,
        name: companyGroups.name,
        slug: companyGroups.slug,
        description: companyGroups.description,
        logoUrl: companyGroups.logoUrl,
        isActive: companyGroups.isActive,
        createdAt: companyGroups.createdAt,
      })
      .from(companyGroups)
      .where(and(eq(companyGroups.isActive, true)))

    const filtered = rows.filter((g) => groupIds.includes(g.id))

    return NextResponse.json({ groups: filtered })
  }
)

const createGroupSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9_-]+$/),
  description: z.string().max(1000).optional(),
  logoUrl: z.string().url().optional(),
})

// POST /api/groups — create a new group (system_administrator only)
export const POST = withGates(
  {
    action: "groups.create",
    endpointClass: "api_write",
    requiredRoles: new Set(["system_administrator"] as const),
    requiredScope: "SCOPE_PLATFORM",
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createGroupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [group] = await db
      .insert(companyGroups)
      .values({ ...parsed.data, ownerId: ctx.session.userId })
      .returning({ id: companyGroups.id, slug: companyGroups.slug })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "groups.create",
      entityType: "company_group",
      entityId: group!.id,
      payload: { slug: group!.slug },
      method: "POST",
      path: "/api/groups",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ groupId: group!.id, slug: group!.slug }, { status: 201 })
  }
)
