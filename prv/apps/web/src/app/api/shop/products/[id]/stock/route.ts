import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { products } from "@prv/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"
import { appendRealtimeEvent, realtimeChannel, REALTIME_EVENT } from "@prv/cache"
import { inngest } from "@prv/jobs/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// PATCH /api/shop/products/[id]/stock
// Body: { adjustment: number, reason?: string }
// Positive = restock, Negative = sale/correction
export const PATCH = withGates(
  { action: "shop.products.stock_adjust", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const pathParts = req.nextUrl.pathname.split("/").filter(Boolean)
    // Path: /api/shop/products/[id]/stock → id is 4th segment (0-indexed: api, shop, products, [id], stock)
    const productIdx = pathParts.indexOf("products")
    const id = pathParts[productIdx + 1] ?? ""
    if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 })

    const body = (await req.json().catch(() => ({}))) as { adjustment?: number; reason?: string }
    const { adjustment, reason } = body

    if (adjustment === undefined || typeof adjustment !== "number") {
      return NextResponse.json({ error: "adjustment (number) required" }, { status: 400 })
    }
    if (!Number.isInteger(adjustment) || adjustment === 0) {
      return NextResponse.json({ error: "adjustment must be a non-zero integer" }, { status: 422 })
    }

    // Load current stock
    const [existing] = await db
      .select({
        id: products.id,
        name: products.name,
        stockQuantity: products.stockQuantity,
        stockMinimum: products.stockMinimum,
      })
      .from(products)
      .where(
        and(eq(products.id, id), eq(products.companyId, companyId), isNull(products.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const newQty = existing.stockQuantity + adjustment
    if (newQty < 0) {
      return NextResponse.json(
        {
          error: "Adjustment would result in negative stock",
          current: existing.stockQuantity,
          adjustment,
          result: newQty,
        },
        { status: 422 }
      )
    }

    const [updated] = await db
      .update(products)
      .set({ stockQuantity: newQty, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))
      .returning({
        id: products.id,
        stockQuantity: products.stockQuantity,
        stockMinimum: products.stockMinimum,
      })

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.products.stock_adjust",
      entityType: "product",
      entityId: id,
      payload: {
        name: existing.name,
        before: existing.stockQuantity,
        adjustment,
        after: newQty,
        reason: reason ?? null,
      },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    void appendRealtimeEvent(realtimeChannel.shop(companyId), REALTIME_EVENT.SHOP_UPDATE, {
      entityType: "product",
      entityId: id,
      action: "updated",
      companyId,
    }).catch(() => null)

    // Trigger low-stock check if quantity is at or below minimum
    if (updated && updated.stockQuantity <= updated.stockMinimum) {
      void inngest
        .send({
          name: "prv/shop.stock.low",
          data: {
            companyId,
            productId: id,
            productName: existing.name,
            stockQuantity: newQty,
            stockMinimum: existing.stockMinimum,
          },
        })
        .catch(() => null)
    }

    return NextResponse.json({
      id,
      stockQuantity: updated?.stockQuantity ?? newQty,
      stockMinimum: updated?.stockMinimum ?? existing.stockMinimum,
      adjustment,
    })
  }
)
