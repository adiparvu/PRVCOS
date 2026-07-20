import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { db } from "@prv/db"
import { criticalAlertRoutes, companyMemberships, users } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { isCriticalTrigger } from "@/lib/critical-alert-routing"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface CriticalRouteDto {
  id: string
  triggerKey: string
  routeToUserId: string
  routeToName: string | null
  isActive: boolean
  createdAt: string
}

// GET — this company's critical-alert routes (management may view).
export const GET = withGates(
  {
    action: "notifications.preferences.read",
    endpointClass: "api_read",
    requiredRoles: RoleSets.management,
  },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: criticalAlertRoutes.id,
        triggerKey: criticalAlertRoutes.triggerKey,
        routeToUserId: criticalAlertRoutes.routeToUserId,
        isActive: criticalAlertRoutes.isActive,
        createdAt: criticalAlertRoutes.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(criticalAlertRoutes)
      .leftJoin(users, eq(criticalAlertRoutes.routeToUserId, users.id))
      .where(eq(criticalAlertRoutes.companyId, ctx.session.companyId))
      .orderBy(desc(criticalAlertRoutes.createdAt))
      .limit(100)

    const routes: CriticalRouteDto[] = rows.map((r) => ({
      id: r.id,
      triggerKey: r.triggerKey,
      routeToUserId: r.routeToUserId,
      routeToName:
        r.firstName || r.lastName ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() : null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ routes })
  }
)

// POST — create/replace a route for a trigger (admin only).
const createSchema = z.object({
  triggerKey: z.string().min(1).max(100),
  routeToUserId: z.string().uuid(),
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
    if (!parsed.success || !isCriticalTrigger(parsed.data.triggerKey))
      return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    // The recipient must be a member of THIS company (scope safety).
    const [member] = await db
      .select({ userId: companyMemberships.userId })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.userId, parsed.data.routeToUserId)
        )
      )
      .limit(1)
    if (!member)
      return NextResponse.json({ error: "Recipient must be a company member" }, { status: 422 })

    // One route per (company, trigger) — upsert so re-mapping just updates it.
    const [row] = await db
      .insert(criticalAlertRoutes)
      .values({
        companyId,
        triggerKey: parsed.data.triggerKey,
        routeToUserId: parsed.data.routeToUserId,
        createdById: userId,
      })
      .onConflictDoUpdate({
        target: [criticalAlertRoutes.companyId, criticalAlertRoutes.triggerKey],
        set: { routeToUserId: parsed.data.routeToUserId, isActive: true, updatedAt: new Date() },
      })
      .returning({ id: criticalAlertRoutes.id })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "notifications.critical_route.set",
      entityType: "critical_alert_route",
      entityId: row?.id ?? parsed.data.triggerKey,
      payload: { triggerKey: parsed.data.triggerKey, routeToUserId: parsed.data.routeToUserId },
      method: "POST",
      path: "/api/notifications/critical-routes",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: row?.id }, { status: 201 })
  }
)
