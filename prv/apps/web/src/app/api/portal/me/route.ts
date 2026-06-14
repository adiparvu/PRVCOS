import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import { db } from "@prv/db"
import { portalAccounts } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { z } from "zod"

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

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
})

export const PATCH = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const [updated] = await db
      .update(portalAccounts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(portalAccounts.id, ctx.accountId))
      .returning({ id: portalAccounts.id, name: portalAccounts.name, email: portalAccounts.email })

    if (!updated) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    return NextResponse.json({ account: updated })
  }
)
