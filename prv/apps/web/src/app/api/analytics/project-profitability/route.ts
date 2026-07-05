import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { projects, invoices } from "@prv/db/schema"
import { and, eq, isNotNull, isNull, sum } from "drizzle-orm"
import { computeProfitability, type Portfolio } from "@/lib/project-profitability"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ProjectProfitabilityResponse = Portfolio

// GET /api/analytics/project-profitability — cross-module BI: paid-invoice
// revenue (Finance) vs spent budget (Projects) per project.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId

    const [projectRows, revenueRows] = await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          budget: projects.budget,
          spentBudget: projects.spentBudget,
        })
        .from(projects)
        .where(and(eq(projects.companyId, companyId), isNull(projects.deletedAt))),
      db
        .select({ projectId: invoices.projectId, total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, "paid"),
            isNotNull(invoices.projectId),
            isNull(invoices.deletedAt)
          )
        )
        .groupBy(invoices.projectId),
    ])

    const revenueByProject = new Map<string, number>()
    for (const r of revenueRows) {
      if (r.projectId) revenueByProject.set(r.projectId, Number(r.total ?? 0))
    }

    const portfolio = computeProfitability(
      projectRows.map((p) => ({
        id: p.id,
        name: p.name,
        revenue: revenueByProject.get(p.id) ?? 0,
        cost: Number(p.spentBudget ?? 0),
        budget: Number(p.budget ?? 0),
      }))
    )

    return NextResponse.json(portfolio)
  }
)
