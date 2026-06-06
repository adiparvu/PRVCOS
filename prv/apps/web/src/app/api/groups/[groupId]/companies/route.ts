import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import { db } from "@prv/db"
import { groupMemberships, companies } from "@prv/db/schema"
import { eq, and } from "drizzle-orm"
import { RoleSets, writeAuditLog } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const addCompanySchema = z.object({
  companyId: z.string().uuid(),
})

// POST /api/groups/[groupId]/companies — add a company to a group
export const POST = withGates(
  {
    action: "groups.companies.add",
    endpointClass: "api_write",
    requiredRoles: new Set(["system_administrator"] as const),
    requiredScope: "SCOPE_PLATFORM",
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const groupId = req.nextUrl.pathname.split("/").at(-2)!

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = addCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { companyId } = parsed.data

    // Validate company exists
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.isActive, true)))
      .limit(1)

    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    // Upsert membership
    const [existing] = await db
      .select({ id: groupMemberships.id })
      .from(groupMemberships)
      .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.companyId, companyId)))
      .limit(1)

    if (existing) {
      await db
        .update(groupMemberships)
        .set({ isActive: true, leftAt: null, updatedAt: new Date() })
        .where(eq(groupMemberships.id, existing.id))
    } else {
      await db.insert(groupMemberships).values({
        groupId,
        companyId,
        addedBy: ctx.session.userId,
      })
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "groups.companies.add",
      entityType: "group_membership",
      entityId: groupId,
      payload: { groupId, companyId },
      method: "POST",
      path: `/api/groups/${groupId}/companies`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  }
)

// DELETE /api/groups/[groupId]/companies — remove a company from a group
export const DELETE = withGates(
  {
    action: "groups.companies.remove",
    endpointClass: "api_write",
    requiredRoles: new Set(["system_administrator"] as const),
    requiredScope: "SCOPE_PLATFORM",
    requireReauth: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const groupId = req.nextUrl.pathname.split("/").at(-2)!

    const url = new URL(req.url)
    const companyId = url.searchParams.get("companyId")
    if (!companyId)
      return NextResponse.json({ error: "companyId query param required" }, { status: 422 })

    await db
      .update(groupMemberships)
      .set({ isActive: false, leftAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.companyId, companyId),
          eq(groupMemberships.isActive, true)
        )
      )

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "groups.companies.remove",
      entityType: "group_membership",
      entityId: groupId,
      payload: { groupId, companyId },
      method: "DELETE",
      path: `/api/groups/${groupId}/companies`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true })
  }
)
