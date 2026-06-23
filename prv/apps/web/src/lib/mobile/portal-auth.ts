import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@prv/db"
import { portalAccounts, portalSessions } from "@prv/db/schema"
import { and, eq, gt, isNull } from "drizzle-orm"
import { createHash } from "node:crypto"
import type { PortalSessionContext } from "@/lib/portal-auth"

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

function unauthorized(msg = "Session expired or invalid") {
  return NextResponse.json({ error: msg, code: "UNAUTHORIZED" }, { status: 401 })
}

export type PortalMobileHandler = (
  req: NextRequest,
  ctx: PortalSessionContext
) => Promise<NextResponse>

export function withPortalMobileAuth(
  handler: PortalMobileHandler,
  opts: { portalType?: PortalSessionContext["portalType"] } = {}
): (req: NextRequest | Request) => Promise<NextResponse> {
  return async (req) => {
    const auth = req.headers.get("authorization")
    if (!auth?.startsWith("Bearer ")) return unauthorized("Missing authorization header")
    const raw = auth.slice(7).trim()
    if (!raw) return unauthorized()

    const [row] = await db
      .select({
        sessionId: portalSessions.id,
        accountId: portalAccounts.id,
        companyId: portalSessions.companyId,
        portalType: portalAccounts.portalType,
        clientId: portalAccounts.clientId,
        supplierId: portalAccounts.supplierId,
        email: portalAccounts.email,
        name: portalAccounts.name,
        isActive: portalAccounts.isActive,
      })
      .from(portalSessions)
      .innerJoin(portalAccounts, eq(portalSessions.accountId, portalAccounts.id))
      .where(
        and(
          eq(portalSessions.tokenHash, hashToken(raw)),
          isNull(portalSessions.revokedAt),
          gt(portalSessions.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!row || !row.isActive) return unauthorized()

    if (opts.portalType && row.portalType !== opts.portalType) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
    }

    // Touch lastSeenAt async — don't block the request
    void db
      .update(portalSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(portalSessions.id, row.sessionId))
      .catch(() => {})

    const ctx: PortalSessionContext = {
      sessionId: row.sessionId,
      accountId: row.accountId,
      companyId: row.companyId,
      portalType: row.portalType,
      clientId: row.clientId,
      supplierId: row.supplierId,
      email: row.email,
      name: row.name,
    }
    return handler(req as NextRequest, ctx)
  }
}
