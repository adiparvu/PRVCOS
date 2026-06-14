import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import { db } from "@prv/db"
import { portalAccounts } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import type { PortalSessionContext } from "@/lib/portal-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withPortalAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    const [account] = await db
      .select({
        id: portalAccounts.id,
        email: portalAccounts.email,
        name: portalAccounts.name,
        portalType: portalAccounts.portalType,
        companyId: portalAccounts.companyId,
        clientId: portalAccounts.clientId,
        supplierId: portalAccounts.supplierId,
        createdAt: portalAccounts.createdAt,
        lastLoginAt: portalAccounts.lastLoginAt,
      })
      .from(portalAccounts)
      .where(eq(portalAccounts.id, ctx.accountId))
      .limit(1)

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    return NextResponse.json({ account })
  }
)
