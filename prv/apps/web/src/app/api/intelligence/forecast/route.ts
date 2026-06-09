import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { revenueForecastSeries, forecastRiskItems, forecastOpportunities } from "@prv/db/schema"
import { and, asc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.forecast.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)

    const [seriesRows, riskRows, opportunityRows] = await Promise.all([
      db
        .select({
          monthLabel: revenueForecastSeries.monthLabel,
          actualAmount: revenueForecastSeries.actualAmount,
          forecastAmount: revenueForecastSeries.forecastAmount,
          lowerBound: revenueForecastSeries.lowerBound,
          upperBound: revenueForecastSeries.upperBound,
          confidencePct: revenueForecastSeries.confidencePct,
        })
        .from(revenueForecastSeries)
        .where(
          and(
            eq(revenueForecastSeries.companyId, companyId),
            eq(revenueForecastSeries.year, currentYear)
          )
        )
        .orderBy(asc(revenueForecastSeries.monthIndex)),

      db
        .select({ domain: forecastRiskItems.domain, level: forecastRiskItems.level })
        .from(forecastRiskItems)
        .where(
          and(
            eq(forecastRiskItems.companyId, companyId),
            eq(forecastRiskItems.year, currentYear),
            eq(forecastRiskItems.quarter, currentQuarter)
          )
        ),

      db
        .select({
          title: forecastOpportunities.title,
          valueLabel: forecastOpportunities.valueLabel,
          href: forecastOpportunities.href,
        })
        .from(forecastOpportunities)
        .where(
          and(
            eq(forecastOpportunities.companyId, companyId),
            eq(forecastOpportunities.year, currentYear),
            eq(forecastOpportunities.quarter, currentQuarter)
          )
        )
        .orderBy(asc(forecastOpportunities.sortOrder)),
    ])

    // Use confidencePct from the first forecast entry that has one
    const confidence = seriesRows.find((s) => s.confidencePct != null)?.confidencePct ?? 0

    // Build series: amounts stored in full euros, chart expects thousands
    const series = seriesRows.map((s) => {
      const entry: Record<string, unknown> = { month: s.monthLabel }
      if (s.actualAmount != null) entry.actual = Math.round(Number(s.actualAmount) / 1_000)
      if (s.forecastAmount != null) entry.forecast = Math.round(Number(s.forecastAmount) / 1_000)
      if (s.lowerBound != null) entry.lower = Math.round(Number(s.lowerBound) / 1_000)
      if (s.upperBound != null) entry.upper = Math.round(Number(s.upperBound) / 1_000)
      return entry
    })

    return NextResponse.json({
      confidence,
      series,
      risks: riskRows.map((r) => ({ domain: r.domain, level: r.level })),
      opportunities: opportunityRows.map((o) => ({
        title: o.title,
        value: o.valueLabel,
        href: o.href,
      })),
    })
  }
)
