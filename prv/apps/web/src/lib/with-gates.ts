import { AuthError, runGateChain } from "@prv/auth"
import type { RouteConfig, GateContext } from "@prv/auth"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export type { RouteConfig, GateContext }

// Wrap a Next.js App Router route handler with the Zero Trust gate chain.
// The returned function accepts ...args so it is compatible with both plain
// routes (tests call it as handler(req, ctx)) and dynamic routes where Next.js
// passes a second context argument that is ignored here (params are extracted
// from req.url in the handler instead).
export function withGates(
  config: RouteConfig,
  handler: (req: NextRequest, ctx: GateContext) => Promise<NextResponse | Response>
): (req: NextRequest | Request, ...args: unknown[]) => Promise<NextResponse | Response> {
  return async (req: NextRequest | Request, ...args: unknown[]) => {
    try {
      const ctx = await runGateChain(req as Request, config)
      return await handler(req as NextRequest, ctx)
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

export { runGateChain }
