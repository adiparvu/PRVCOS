import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { clients, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import {
  computeCrmAnalytics,
  type CrmAnalytics,
  type LeadRecord,
  type LeadSource,
  type LeadStage,
} from "@/lib/crm-analytics"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type { CrmAnalytics } from "@/lib/crm-analytics"

// GET /api/crm/analytics — the sales pipeline analytics snapshot.
// Leads are `clients` rows (status = "prospect"); stage/source/value live in
// metadata. We fetch them with the assigned rep and hand off to the pure helper.
export const GET = withGates(
  { action: "crm.leads.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        metadata: clients.metadata,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        repFirstName: users.firstName,
        repLastName: users.lastName,
      })
      .from(clients)
      .leftJoin(users, eq(clients.assignedUserId, users.id))
      .where(
        and(
          eq(clients.companyId, ctx.session.companyId),
          eq(clients.status, "prospect"),
          isNull(clients.deletedAt)
        )
      )

    const leads: LeadRecord[] = rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>
      const stage = (meta.stage as LeadStage) ?? "new"
      const source = (meta.source as LeadSource) ?? "website"
      const estimatedValue = typeof meta.estimatedValue === "number" ? meta.estimatedValue : 0
      const rep = r.repFirstName ? `${r.repFirstName} ${r.repLastName ?? ""}`.trim() : "Unassigned"
      return {
        stage,
        source,
        estimatedValue,
        rep,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }
    })

    const analytics: CrmAnalytics = computeCrmAnalytics(leads, Date.now())
    return NextResponse.json(analytics)
  }
)
