import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { renovationContracts, renovationProjects } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Contracts on the client's renovation projects, for viewing and e-signing.
export const GET = withPortalAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const rows = await db
      .select({
        id: renovationContracts.id,
        contractNumber: renovationContracts.contractNumber,
        status: renovationContracts.status,
        contractValue: renovationContracts.contractValue,
        currency: renovationContracts.currency,
        startDate: renovationContracts.startDate,
        endDate: renovationContracts.endDate,
        signedByClientAt: renovationContracts.signedByClientAt,
        signedByCompanyAt: renovationContracts.signedByCompanyAt,
        projectTitle: renovationProjects.title,
        createdAt: renovationContracts.createdAt,
      })
      .from(renovationContracts)
      .innerJoin(renovationProjects, eq(renovationContracts.projectId, renovationProjects.id))
      .where(
        and(
          eq(renovationProjects.companyId, ctx.companyId),
          eq(renovationProjects.clientId, ctx.clientId),
          isNull(renovationContracts.deletedAt)
        )
      )
      .orderBy(desc(renovationContracts.createdAt))
      .limit(100)

    const contracts = rows.map((r) => ({
      id: r.id,
      contractNumber: r.contractNumber,
      status: r.status,
      value: Number(r.contractValue),
      currency: r.currency,
      startDate: r.startDate,
      endDate: r.endDate,
      signedByClientAt: r.signedByClientAt ? r.signedByClientAt.toISOString() : null,
      signedByCompanyAt: r.signedByCompanyAt ? r.signedByCompanyAt.toISOString() : null,
      project: r.projectTitle,
      // The client may sign a sent contract they have not yet signed.
      signable: r.status === "sent" && r.signedByClientAt === null,
    }))

    return NextResponse.json({ contracts, count: contracts.length })
  },
  { portalType: "client" }
)
