import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { products, stockLevels, stockMovements } from "@prv/db/schema"
import { and, eq, gte, isNull, max, sql, sum } from "drizzle-orm"
import { computeDemandForecast, type DemandForecastSummary } from "@/lib/demand-forecast"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_DAYS = 90 // trailing window for velocity
const HORIZON_DAYS = 30 // planning horizon for the reorder plan

export type DemandForecastResponse = DemandForecastSummary

// GET /api/analytics/demand-forecast — forward-looking reorder planning: project
// each product's demand from its trailing sale velocity, then derive days-of-
// cover, stockout risk, and a suggested reorder quantity.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const companyId = ctx.session.companyId
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000)

    const [productRows, stockRows, soldRows] = await Promise.all([
      db
        .select({ id: products.id, name: products.name, costPrice: products.costPrice })
        .from(products)
        .where(and(eq(products.companyId, companyId), isNull(products.deletedAt))),
      db
        .select({
          productId: stockLevels.productId,
          onHand: sum(stockLevels.quantity),
          minimum: max(stockLevels.minimum),
          reorderPoint: max(stockLevels.reorderPoint),
        })
        .from(stockLevels)
        .where(eq(stockLevels.companyId, companyId))
        .groupBy(stockLevels.productId),
      db
        .select({
          productId: stockMovements.productId,
          sold: sql<string>`coalesce(sum(-${stockMovements.delta}), 0)`,
        })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.companyId, companyId),
            eq(stockMovements.type, "sale"),
            gte(stockMovements.createdAt, since)
          )
        )
        .groupBy(stockMovements.productId),
    ])

    const stockByProduct = new Map(stockRows.map((s) => [s.productId, s]))
    const soldByProduct = new Map<string, number>()
    for (const s of soldRows) soldByProduct.set(s.productId, Number(s.sold ?? 0))

    const forecast = computeDemandForecast(
      productRows.map((p) => {
        const stock = stockByProduct.get(p.id)
        return {
          productId: p.id,
          name: p.name,
          unitsSold: soldByProduct.get(p.id) ?? 0,
          currentStock: Number(stock?.onHand ?? 0),
          reorderPoint: stock?.reorderPoint ?? null,
          minimum: Number(stock?.minimum ?? 0),
          costPrice: Number(p.costPrice ?? 0),
        }
      }),
      WINDOW_DAYS,
      HORIZON_DAYS
    )

    return NextResponse.json(forecast)
  }
)
