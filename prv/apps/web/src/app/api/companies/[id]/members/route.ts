import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { companyMemberships } from "@prv/db/schema"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { z } from "zod"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  primaryRole: z.string().min(1).max(100),
  additionalRoles: z.array(z.string()).default([]),
  scopeLevel: z.number().int().min(1).max(9).default(1),
  scopeTargetType: z.string().max(50).optional(),
  scopeTargetId: z.string().uuid().optional(),
})

// POST /api/companies/[id]/members — add a user to a company
export const POST = withGates(
  {
    action: "companies.members.add",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
    requireMfa: true,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = req.nextUrl.pathname.split("/").at(-2)

    if (!companyId) {
      return NextResponse.json({ error: "Missing company id" }, { status: 400 })
    }
    if (companyId !== ctx.session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = addMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    // Guard: prevent duplicate memberships
    const [existing] = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.userId, parsed.data.userId)
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "User already has a membership in this company", code: "MEMBERSHIP_EXISTS" },
        { status: 409 }
      )
    }

    const [membership] = await db
      .insert(companyMemberships)
      .values({
        companyId,
        userId: parsed.data.userId,
        primaryRole: parsed.data.primaryRole,
        additionalRoles: parsed.data.additionalRoles,
        scopeLevel: parsed.data.scopeLevel,
        scopeTargetType: parsed.data.scopeTargetType,
        scopeTargetId: parsed.data.scopeTargetId,
        status: "INVITED",
        invitedBy: ctx.session.userId,
        invitedAt: new Date(),
      })
      .returning({
        id: companyMemberships.id,
        userId: companyMemberships.userId,
        primaryRole: companyMemberships.primaryRole,
        status: companyMemberships.status,
      })

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "companies.members.add",
      entityType: "company_membership",
      entityId: membership!.id,
      payload: { userId: parsed.data.userId, primaryRole: parsed.data.primaryRole },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(membership, { status: 201 })
  }
)
