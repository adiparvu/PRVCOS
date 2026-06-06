import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { executeNotificationAction } from "@prv/db"
import { writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"
import type { NotificationActionKind } from "@prv/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// POST /api/notifications/[id]/action — { action: "approve" | "decline" }
export const POST = withGates(
  { action: "notifications.action", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const segments = req.nextUrl.pathname.split("/")
    // path: /api/notifications/[id]/action  →  id is index -2
    const id = segments[segments.length - 2]

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    let body: { action: NotificationActionKind }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { action } = body
    if (action !== "approve" && action !== "decline") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const { userId, sessionId, companyId } = ctx.session

    const result = await executeNotificationAction(id, action, userId)

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Failed" }, { status: 422 })
    }

    void writeAuditLog({
      sessionId,
      actorId: userId,
      companyId,
      action: `notification.action.${action}`,
      entityType: "notification",
      entityId: id,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    }).catch(() => null)

    return NextResponse.json({ ok: true })
  }
)
