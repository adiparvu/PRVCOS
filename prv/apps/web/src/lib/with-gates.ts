import { AuthError, runGateChain } from "@prv/auth"
import type { RouteConfig, GateContext } from "@prv/auth"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export type { RouteConfig, GateContext }

type NextRouteCtx<P extends Record<string, string> = Record<string, string>> = {
  params: P | Promise<P>
}

// Wrap a Next.js App Router route handler with the Zero Trust gate chain.
// Supports both plain handlers (req, ctx) and dynamic route handlers (req, ctx, { params }).
export function withGates<P extends Record<string, string> = Record<string, string>>(
  config: RouteConfig,
  handler: (
    req: NextRequest,
    ctx: GateContext,
    nextCtx: NextRouteCtx<P>
  ) => Promise<NextResponse | Response>
): (req: NextRequest | Request, nextCtx: NextRouteCtx<P>) => Promise<NextResponse | Response>

export function withGates(
  config: RouteConfig,
  handler: (req: NextRequest, ctx: GateContext) => Promise<NextResponse | Response>
): (req: NextRequest | Request) => Promise<NextResponse | Response>

export function withGates(
  config: RouteConfig,
  handler: (
    req: NextRequest,
    ctx: GateContext,
    nextCtx?: NextRouteCtx
  ) => Promise<NextResponse | Response>
): (req: NextRequest | Request, nextCtx?: NextRouteCtx) => Promise<NextResponse | Response> {
  return async (req: NextRequest | Request, nextCtx?: NextRouteCtx) => {
    try {
      const ctx = await runGateChain(req as Request, config)
      return await handler(req as NextRequest, ctx, nextCtx as NextRouteCtx)
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.statusCode })
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

export { runGateChain }
