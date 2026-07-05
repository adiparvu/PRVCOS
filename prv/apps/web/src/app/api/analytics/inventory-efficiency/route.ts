import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { products, stockLevels, stockMovements } from "@prv/db/schema"
import { and, eq, gte, isNull, sql, sum } from "drizzle-orm"
import {
  computeInventoryEfficiency,
  type InventoryEfficiencySummary,
} from "@/lib/inventory-efficiency"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WINDOW_DAYS = 90 // sell-through window used to derive turnover

export type InventoryEfficiencyResponse = InventoryEfficiencySummary & { periodDays: number }

// GET /api/analytics/inventory-efficiency — cross-module BI: procurement cost
// (Finance, product cost price × on-hand) vs sell-through (Shop, "sale" stock
// movements) → annualized turnover, days-on-hand, and dead-stock detection.
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
        .select({ productId: stockLevels.productId, onHand: sum(stockLevels.quantity) })
        .from(stockLevels)
        .where(eq(stockLevels.companyId, companyId))
        .groupBy(stockLevels.productId),
      db
        .select({
          productId: stockMovements.productId,
          // "sale" deltas are negative; sum the magnitude sold in the window.
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

    const stockByProduct = new Map<string, number>()
    for (const s of stockRows) stockByProduct.set(s.productId, Number(s.onHand ?? 0))
    const soldByProduct = new Map<string, number>()
    for (const s of soldRows) soldByProduct.set(s.productId, Number(s.sold ?? 0))

    const roi = computeInventoryEfficiency(
      productRows.map((p) => ({
        productId: p.id,
        name: p.name,
        unitsSold: soldByProduct.get(p.id) ?? 0,
        currentStock: stockByProduct.get(p.id) ?? 0,
        costPrice: Number(p.costPrice ?? 0),
      })),
      WINDOW_DAYS
    )

    return NextResponse.json({ ...roi, periodDays: WINDOW_DAYS })
  }
)
