import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { stockLevels, products, stores } from "@prv/db/schema"
import { and, eq, asc } from "drizzle-orm"
import { stockStatus, type StockStatus } from "@/lib/inventory"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface StockLevelRow {
  id: string
  productId: string
  productName: string | null
  sku: string | null
  storeId: string
  storeName: string | null
  quantity: number
  minimum: number
  reorderPoint: number | null
  status: StockStatus
}

export interface InventoryMeta {
  skus: number
  totalUnits: number
  low: number
  reorder: number
  out: number
}

// GET /api/inventory?storeId=&status= — stock levels across locations, each
// banded ok/low/reorder/out, with a summary for the dashboard.
export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const storeId = sp.get("storeId")
    const statusFilter = sp.get("status")

    const conds = [eq(stockLevels.companyId, ctx.session.companyId)]
    if (storeId) conds.push(eq(stockLevels.storeId, storeId))

    const rows = await db
      .select({
        id: stockLevels.id,
        productId: stockLevels.productId,
        storeId: stockLevels.storeId,
        quantity: stockLevels.quantity,
        minimum: stockLevels.minimum,
        reorderPoint: stockLevels.reorderPoint,
        productName: products.name,
        sku: products.sku,
        storeName: stores.name,
      })
      .from(stockLevels)
      .leftJoin(products, eq(stockLevels.productId, products.id))
      .leftJoin(stores, eq(stockLevels.storeId, stores.id))
      .where(and(...conds))
      .orderBy(asc(products.name))

    let levels: StockLevelRow[] = rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      sku: r.sku,
      storeId: r.storeId,
      storeName: r.storeName,
      quantity: r.quantity,
      minimum: r.minimum,
      reorderPoint: r.reorderPoint,
      status: stockStatus(r.quantity, r.minimum, r.reorderPoint),
    }))

    // Worst first.
    const rank: Record<StockStatus, number> = { out: 0, reorder: 1, low: 2, ok: 3 }
    levels.sort((a, b) => rank[a.status] - rank[b.status])

    if (statusFilter && ["out", "reorder", "low", "ok"].includes(statusFilter)) {
      levels = levels.filter((l) => l.status === statusFilter)
    }

    const meta: InventoryMeta = {
      skus: rows.length,
      totalUnits: rows.reduce((s, r) => s + r.quantity, 0),
      low: rows.filter((r) => stockStatus(r.quantity, r.minimum, r.reorderPoint) === "low").length,
      reorder: rows.filter((r) => stockStatus(r.quantity, r.minimum, r.reorderPoint) === "reorder")
        .length,
      out: rows.filter((r) => r.quantity <= 0).length,
    }

    return NextResponse.json({ levels, meta })
  }
)
