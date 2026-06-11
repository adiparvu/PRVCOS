import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { queryShopOrderSummary, queryTopProducts, queryLowStockProducts } from "@prv/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "shop.analytics.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const { searchParams } = new URL(req.url)

    const monthParam = searchParams.get("month")
    const month = monthParam ? new Date(monthParam) : undefined
    const topN = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 50)

    const [orderSummary, topProducts, lowStock] = await Promise.all([
      queryShopOrderSummary(companyId, month),
      queryTopProducts(companyId, topN),
      queryLowStockProducts(companyId),
    ])

    return NextResponse.json({
      orderSummary,
      topProducts,
      lowStock: {
        count: lowStock.length,
        products: lowStock,
      },
    })
  }
)
