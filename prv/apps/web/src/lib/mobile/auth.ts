import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSession, refreshSession } from "@prv/auth"
import type { SystemRole, ScopeLevel } from "@prv/auth"
import { checkRateLimit } from "@prv/cache"

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

export function withMobileAuth(
  handler: MobileHandler
): (req: NextRequest | Request, ...args: unknown[]) => Promise<NextResponse> {
  return async (req: NextRequest | Request): Promise<NextResponse> => {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return unauthorized("Missing authorization header")

    const sessionId = authHeader.slice(7).trim()
    if (!sessionId) return unauthorized()

    let session
    try {
      session = await getSession(sessionId)
    } catch {
      return unauthorized()
    }
    // Refresh TTL on each request (keeps active users logged in)
    void refreshSession(sessionId)

    // Per-user rate limit, mirroring Gate 7 of the web gate chain. The edge
    // middleware only limits per IP, which under-throttles a hostile session
    // and over-throttles offices behind one NAT. Outside the try above so a
    // limiter failure surfaces as 500, not a misleading 401.
    const path = new URL(req.url).pathname
    const method = req.method.toUpperCase()
    const endpointClass = method === "GET" || method === "HEAD" ? "api_read" : "api_write"
    const rl = await checkRateLimit(endpointClass, `${session.userId}:${path}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.reset),
            "Retry-After": String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))),
          },
        }
      )
    }

    return handler(req as NextRequest, {
      sessionId: session.sessionId,
      userId: session.userId,
      companyId: session.companyId,
      role: session.role,
      scopeLevel: session.scopeLevel,
    })
  }
}
