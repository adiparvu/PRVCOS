import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getPortalSession, type PortalSessionContext } from "@/lib/portal-auth"
import { checkRateLimit } from "@prv/cache"

export type PortalHandler = (req: NextRequest, ctx: PortalSessionContext) => Promise<NextResponse>

function unauthorized(message = "Session expired or invalid") {
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 })
}

export function withPortalAuth(
  handler: PortalHandler,
  opts: { portalType?: PortalSessionContext["portalType"] } = {}
): (req: NextRequest | Request, ...args: unknown[]) => Promise<NextResponse> {
  return async (req: NextRequest | Request): Promise<NextResponse> => {
    const session = await getPortalSession()
    if (!session) return unauthorized()
    if (opts.portalType && session.portalType !== opts.portalType) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 })
    }

    // Per-account rate limit, mirroring Gate 7 of the staff gate chain. Portal
    // accounts are external parties — throttle them at least as strictly.
    const path = new URL(req.url).pathname
    const method = req.method.toUpperCase()
    const endpointClass = method === "GET" || method === "HEAD" ? "api_read" : "api_write"
    const rl = await checkRateLimit(endpointClass, `portal:${session.accountId}:${path}`)
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

    return handler(req as NextRequest, session)
  }
}
