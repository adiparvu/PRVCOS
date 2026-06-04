import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db } from "@prv/db"
import { dataErasureRequests } from "@prv/db/schema"

import { RoleSets } from "@prv/auth"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Wrap withGates to forward Next.js dynamic route params
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

export const GET = makeHandler(
  {
    action: "gdpr.erasure.read",
    endpointClass: "api_read",
    requiredRoles: RoleSets.admin,
    requiredScope: "SCOPE_COMPANY",
  },
  async (_req, ctx, { id }) => {
    const [request] = await db
      .select()
      .from(dataErasureRequests)
      .where(
        and(
          eq(dataErasureRequests.id, id!),
          eq(dataErasureRequests.companyId, ctx.session.companyId)
        )
      )
      .limit(1)

    if (!request) {
      return NextResponse.json({ error: "Erasure request not found" }, { status: 404 })
    }

    return NextResponse.json(request)
  }
)
