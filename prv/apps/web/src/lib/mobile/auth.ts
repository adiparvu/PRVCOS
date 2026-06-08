import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSession, refreshSession } from "@prv/auth"
import type { SystemRole, ScopeLevel } from "@prv/auth"

export interface MobileContext {
  sessionId: string
  userId: string
  companyId: string
  role: SystemRole
  scopeLevel: ScopeLevel
}

export type MobileHandler = (req: NextRequest, ctx: MobileContext) => Promise<NextResponse>

function unauthorized(message = "Session expired or invalid") {
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 })
}

export function withMobileAuth(handler: MobileHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return unauthorized("Missing authorization header")

    const sessionId = authHeader.slice(7).trim()
    if (!sessionId) return unauthorized()

    try {
      const session = await getSession(sessionId)
      // Refresh TTL on each request (keeps active users logged in)
      void refreshSession(sessionId)
      return handler(req, {
        sessionId: session.sessionId,
        userId: session.userId,
        companyId: session.companyId,
        role: session.role,
        scopeLevel: session.scopeLevel,
      })
    } catch {
      return unauthorized()
    }
  }
}
