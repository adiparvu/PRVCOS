import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { apiKeys } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function makeHandler(
  config: Parameters<typeof withGates>[0],
  handler: (
    req: NextRequest,
    ctx: GateContext,
    params: Record<string, string>
  ) => Promise<NextResponse>
) {
  return (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) =>
    withGates(config, async (r, ctx) => {
      const p = await params
      return handler(r as NextRequest, ctx, p)
    })(req)
}

export const DELETE = makeHandler(
  { action: "api_keys.revoke", endpointClass: "api_write" },
  async (_req, ctx, { id }) => {
    const now = new Date()

    const result = await db
      .update(apiKeys)
      .set({ isActive: false, revokedAt: now, updatedAt: now })
      .where(
        and(eq(apiKeys.id, id!), eq(apiKeys.userId, ctx.session.userId), eq(apiKeys.isActive, true))
      )
      .returning({ id: apiKeys.id })

    if (result.length === 0) {
      return NextResponse.json({ error: "API key not found or already revoked" }, { status: 404 })
    }

    void writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "api_keys.revoke",
      entityType: "api_key",
      entityId: id,
      method: "DELETE",
      path: `/api/keys/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)
