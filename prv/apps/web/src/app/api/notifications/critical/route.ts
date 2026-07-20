import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { notifications } from "@prv/db/schema"
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface CriticalAlertDto {
  id: string
  type: string
  title: string
  body: string | null
  actionUrl: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
}

// GET /api/notifications/critical — the caller's PENDING critical alerts:
// requiresAck, not acknowledged, not dismissed, and within the visibility window.
// Powers the persistent acknowledge banner. Mirrors isCriticalPending().
export const GET = withGates(
  { action: "notifications.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session
    const now = new Date()

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        actionUrl: notifications.actionUrl,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.requiresAck, true),
          isNull(notifications.acknowledgedAt),
          eq(notifications.isDismissed, false),
          or(isNull(notifications.scheduledFor), lte(notifications.scheduledFor, now)),
          or(isNull(notifications.expiresAt), gt(notifications.expiresAt, now))
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(20)

    const alerts: CriticalAlertDto[] = rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      actionUrl: r.actionUrl,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ alerts })
  }
)
