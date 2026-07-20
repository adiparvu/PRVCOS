import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { stockTakeSessions, stockTakeLines, stockLevels, products } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function sessionId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  return parts[parts.indexOf("stock-takes") + 1] ?? ""
}

const bodySchema = z.object({
  productId: z.string().uuid(),
  countedQty: z.number().int().min(0).max(1_000_000),
})

// POST .../lines — record (or update) the physical count for a product. Snapshots
// the current system quantity for this store at count time. Only while counting.
export const POST = withGates(
  { action: "shop.products.stock_adjust", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = sessionId(req)

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    const [s] = await db
      .select({
        id: stockTakeSessions.id,
        storeId: stockTakeSessions.storeId,
        status: stockTakeSessions.status,
      })
      .from(stockTakeSessions)
      .where(and(eq(stockTakeSessions.id, id), eq(stockTakeSessions.companyId, companyId)))
      .limit(1)
    if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (s.status !== "counting")
      return NextResponse.json({ error: "Session is not open for counting" }, { status: 409 })

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, parsed.data.productId), eq(products.companyId, companyId)))
      .limit(1)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const [level] = await db
      .select({ quantity: stockLevels.quantity })
      .from(stockLevels)
      .where(
        and(eq(stockLevels.productId, parsed.data.productId), eq(stockLevels.storeId, s.storeId))
      )
      .limit(1)
    const systemQty = level?.quantity ?? 0

    const [line] = await db
      .insert(stockTakeLines)
      .values({
        sessionId: id,
        companyId,
        productId: parsed.data.productId,
        systemQty,
        countedQty: parsed.data.countedQty,
      })
      .onConflictDoUpdate({
        target: [stockTakeLines.sessionId, stockTakeLines.productId],
        set: { systemQty, countedQty: parsed.data.countedQty, updatedAt: new Date() },
      })
      .returning({ id: stockTakeLines.id })

    return NextResponse.json(
      { id: line?.id, systemQty, variance: parsed.data.countedQty - systemQty },
      { status: 201 }
    )
  }
)
