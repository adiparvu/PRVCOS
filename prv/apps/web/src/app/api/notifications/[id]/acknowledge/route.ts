import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { notifications } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function notifId(req: NextRequest): string {
  // path: /api/notifications/[id]/acknowledge → id is second-to-last segment
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

// POST /api/notifications/[id]/acknowledge — the recipient explicitly acknowledges
// a critical alert ("Am înțeles"). Only the caller's own notification; idempotent
// (guarded on acknowledgedAt IS NULL). Also marks it read.
export const POST = withGates(
  { action: "notifications.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId, sessionId } = ctx.session
    const id = notifId(req)
    const now = new Date()

    const [updated] = await db
      .update(notifications)
      .set({ acknowledgedAt: now, isRead: true, readAt: now })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          eq(notifications.requiresAck, true),
          isNull(notifications.acknowledgedAt)
        )
      )
      .returning({ id: notifications.id })

    if (!updated) {
      // Either not found/owned, or already acknowledged — treat as idempotent OK.
      return NextResponse.json({ acknowledged: true, alreadyDone: true })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "notifications.critical.acknowledge",
      entityType: "notification",
      entityId: id,
      payload: {},
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ acknowledged: true })
  }
)
