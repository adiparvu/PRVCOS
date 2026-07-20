import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { db } from "@prv/db"
import { criticalAlertRoutes } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function routeId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

const patchSchema = z.object({ isActive: z.boolean() })

export const PATCH = withGates(
  {
    action: "notifications.preferences.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = routeId(req)

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    const [updated] = await db
      .update(criticalAlertRoutes)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(and(eq(criticalAlertRoutes.id, id), eq(criticalAlertRoutes.companyId, companyId)))
      .returning({ id: criticalAlertRoutes.id })

    if (!updated) return NextResponse.json({ error: "Route not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "notifications.critical_route.update",
      entityType: "critical_alert_route",
      entityId: id,
      payload: { isActive: parsed.data.isActive },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ updated: true })
  }
)

export const DELETE = withGates(
  {
    action: "notifications.preferences.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = routeId(req)

    const [deleted] = await db
      .delete(criticalAlertRoutes)
      .where(and(eq(criticalAlertRoutes.id, id), eq(criticalAlertRoutes.companyId, companyId)))
      .returning({ id: criticalAlertRoutes.id })

    if (!deleted) return NextResponse.json({ error: "Route not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "notifications.critical_route.delete",
      entityType: "critical_alert_route",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ deleted: true })
  }
)
