import { withGates as coreWithGates, runGateChain } from "@prv/auth"
import type { RouteConfig, GateContext } from "@prv/auth"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export type { RouteConfig, GateContext }

// Wrap a Next.js App Router route handler with the Zero Trust gate chain.
// Usage:
//   export const GET = withGates({ action: "resource.read", endpointClass: "api_read" },
//     async (req, ctx) => { ... })
export function withGates(
  config: RouteConfig,
  handler: (req: NextRequest, ctx: GateContext) => Promise<NextResponse | Response>
): (req: NextRequest | Request, ...args: unknown[]) => Promise<NextResponse | Response> {
  return coreWithGates(
    config,
    handler as (req: Request, ctx: GateContext) => Promise<Response>
  ) as (req: NextRequest | Request, ...args: unknown[]) => Promise<NextResponse | Response>
}

export { runGateChain }
