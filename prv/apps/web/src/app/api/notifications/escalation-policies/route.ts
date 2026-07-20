import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { db } from "@prv/db"
import { notificationEscalationPolicies, companyMemberships, users } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface EscalationPolicyDto {
  id: string
  name: string
  entityType: string | null
  slaMinutes: number
  escalateToUserId: string
  escalateToName: string | null
  isActive: boolean
  createdAt: string
}

// ─── GET — list this company's escalation policies ────────────────────────────
export const GET = withGates(
  {
    action: "notifications.preferences.read",
    endpointClass: "api_read",
    requiredRoles: RoleSets.management,
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: notificationEscalationPolicies.id,
        name: notificationEscalationPolicies.name,
        entityType: notificationEscalationPolicies.entityType,
        slaMinutes: notificationEscalationPolicies.slaMinutes,
        escalateToUserId: notificationEscalationPolicies.escalateToUserId,
        isActive: notificationEscalationPolicies.isActive,
        createdAt: notificationEscalationPolicies.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(notificationEscalationPolicies)
      .leftJoin(users, eq(notificationEscalationPolicies.escalateToUserId, users.id))
      .where(eq(notificationEscalationPolicies.companyId, ctx.session.companyId))
      .orderBy(desc(notificationEscalationPolicies.createdAt))
      .limit(200)

    const policies: EscalationPolicyDto[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      entityType: r.entityType,
      slaMinutes: r.slaMinutes,
      escalateToUserId: r.escalateToUserId,
      escalateToName:
        r.firstName || r.lastName ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() : null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ policies })
  }
)

// ─── POST — create a policy ───────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1).max(200),
  entityType: z.string().min(1).max(100).nullable().optional(),
  slaMinutes: z.number().int().min(5).max(10080), // 5 min … 7 days
  escalateToUserId: z.string().uuid(),
})

export const POST = withGates(
  {
    action: "notifications.preferences.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    // The escalation target must be a member of THIS company — never escalate
    // outside the company boundary (scope safety).
    const [member] = await db
      .select({ userId: companyMemberships.userId })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.userId, parsed.data.escalateToUserId)
        )
      )
      .limit(1)

    if (!member)
      return NextResponse.json(
        { error: "Escalation target must be a member of this company" },
        { status: 422 }
      )

    const [created] = await db
      .insert(notificationEscalationPolicies)
      .values({
        companyId,
        name: parsed.data.name,
        entityType: parsed.data.entityType ?? null,
        slaMinutes: parsed.data.slaMinutes,
        escalateToUserId: parsed.data.escalateToUserId,
        createdById: userId,
      })
      .returning()

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "notifications.escalation_policy.create",
      entityType: "notification_escalation_policy",
      entityId: created.id,
      payload: {
        name: created.name,
        entityType: created.entityType,
        slaMinutes: created.slaMinutes,
        escalateToUserId: created.escalateToUserId,
      },
      method: "POST",
      path: "/api/notifications/escalation-policies",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  }
)
