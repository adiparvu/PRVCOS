import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { renovationContracts, renovationProjects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/portal/contracts/[id]/sign
function contractId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

// The client e-signs a sent contract on one of their projects. Records the
// client signature timestamp; the contract only becomes fully "signed" once the
// company has also countersigned.
export const POST = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const id = contractId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({
        id: renovationContracts.id,
        status: renovationContracts.status,
        signedByClientAt: renovationContracts.signedByClientAt,
        signedByCompanyAt: renovationContracts.signedByCompanyAt,
      })
      .from(renovationContracts)
      .innerJoin(renovationProjects, eq(renovationContracts.projectId, renovationProjects.id))
      .where(
        and(
          eq(renovationContracts.id, id),
          eq(renovationProjects.companyId, ctx.companyId),
          eq(renovationProjects.clientId, ctx.clientId),
          isNull(renovationContracts.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.signedByClientAt) {
      return NextResponse.json({ error: "You have already signed this contract" }, { status: 409 })
    }
    if (existing.status !== "sent") {
      return NextResponse.json(
        { error: `This contract is not available for signing (status: ${existing.status})` },
        { status: 409 }
      )
    }

    const now = new Date()
    // Fully executed only when both parties have signed.
    const fullySigned = existing.signedByCompanyAt !== null
    await db
      .update(renovationContracts)
      .set({
        signedByClientAt: now,
        ...(fullySigned ? { status: "signed" as const } : {}),
        updatedAt: now,
      })
      .where(eq(renovationContracts.id, id))

    return NextResponse.json({
      id,
      signedByClientAt: now.toISOString(),
      status: fullySigned ? "signed" : existing.status,
    })
  },
  { portalType: "client" }
)
