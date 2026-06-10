import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { notifications } from "@prv/db/schema"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const patchSchema = z.object({
  isRead: z.boolean().optional(),
  isDismissed: z.boolean().optional(),
})

// PATCH /api/notifications/[id] — mark a notification as read or dismissed
export const PATCH = withGates(
  { action: "notifications.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }
    if (parsed.data.isRead === undefined && parsed.data.isDismissed === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 422 })
    }

    const now = new Date()
    const set: Record<string, unknown> = {}
    if (parsed.data.isRead === true) {
      set.isRead = true
      set.readAt = now
    } else if (parsed.data.isRead === false) {
      set.isRead = false
      set.readAt = null
    }
    if (parsed.data.isDismissed === true) {
      set.isDismissed = true
      set.dismissedAt = now
    }

    const [row] = await db
      .update(notifications)
      .set(set)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, ctx.session.userId),
          eq(notifications.companyId, ctx.session.companyId)
        )
      )
      .returning({
        id: notifications.id,
        isRead: notifications.isRead,
        isDismissed: notifications.isDismissed,
      })

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json(row)
  }
)

// ─── DELETE /api/notifications/[id] ──────────────────────────────────────────

export const DELETE = withGates(
  { action: "notifications.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(notifications)
      .set({ deletedAt: new Date() } as Record<string, unknown>)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId)
        )
      )

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "notifications.delete",
      entityType: "notification",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/notifications/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
