import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { stockTakeSessions, stockTakeLines, products } from "@prv/db/schema"
import { and, asc, eq } from "drizzle-orm"
import { summarizeStockTake, variance, type StockTakeSummary } from "@/lib/stock-take"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface StockTakeLineDto {
  id: string
  productId: string
  productName: string | null
  sku: string | null
  systemQty: number
  countedQty: number
  variance: number
  posted: boolean
}

export interface StockTakeDetail {
  id: string
  name: string
  storeId: string
  status: "draft" | "counting" | "posted" | "cancelled"
  notes: string | null
  postedAt: string | null
  createdAt: string
  lines: StockTakeLineDto[]
  summary: StockTakeSummary
}

function sessionId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = sessionId(req)

    const [s] = await db
      .select()
      .from(stockTakeSessions)
      .where(and(eq(stockTakeSessions.id, id), eq(stockTakeSessions.companyId, companyId)))
      .limit(1)
    if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await db
      .select({
        id: stockTakeLines.id,
        productId: stockTakeLines.productId,
        systemQty: stockTakeLines.systemQty,
        countedQty: stockTakeLines.countedQty,
        posted: stockTakeLines.posted,
        productName: products.name,
        sku: products.sku,
      })
      .from(stockTakeLines)
      .leftJoin(products, eq(stockTakeLines.productId, products.id))
      .where(eq(stockTakeLines.sessionId, id))
      .orderBy(asc(products.name))

    const lines: StockTakeLineDto[] = rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName ?? null,
      sku: r.sku ?? null,
      systemQty: r.systemQty,
      countedQty: r.countedQty,
      variance: variance(r.systemQty, r.countedQty),
      posted: r.posted,
    }))

    const detail: StockTakeDetail = {
      id: s.id,
      name: s.name,
      storeId: s.storeId,
      status: s.status,
      notes: s.notes,
      postedAt: s.postedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      lines,
      summary: summarizeStockTake(lines),
    }
    return NextResponse.json(detail)
  }
)
