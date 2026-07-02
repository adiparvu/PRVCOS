import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { orderReturns, orders } from "@prv/db/schema"
import { eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STATUSES = ["requested", "approved", "received", "refunded", "rejected"] as const

export interface ReturnSummary {
  id: string
  returnNumber: string
  orderId: string
  orderNumber: string | null
  reason: string
  status: (typeof STATUSES)[number]
  refundAmount: number
  restock: boolean
  createdAt: string
}

export interface ReturnsMeta {
  total: number
  open: number
  refunded: number
  totalRefunded: number
}

function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// GET /api/shop/returns — the company returns register + summary.
export const GET = withGates(
  { action: "shop.orders.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: orderReturns.id,
        returnNumber: orderReturns.returnNumber,
        orderId: orderReturns.orderId,
        reason: orderReturns.reason,
        status: orderReturns.status,
        refundAmount: orderReturns.refundAmount,
        restock: orderReturns.restock,
        createdAt: orderReturns.createdAt,
        orderNumber: orders.orderNumber,
      })
      .from(orderReturns)
      .leftJoin(orders, eq(orderReturns.orderId, orders.id))
      .where(eq(orderReturns.companyId, ctx.session.companyId))
      .orderBy(desc(orderReturns.createdAt))

    const returns: ReturnSummary[] = rows.map((r) => ({
      id: r.id,
      returnNumber: r.returnNumber,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      reason: r.reason,
      status: r.status as (typeof STATUSES)[number],
      refundAmount: num(r.refundAmount),
      restock: r.restock,
      createdAt: r.createdAt.toISOString(),
    }))

    const meta: ReturnsMeta = {
      total: returns.length,
      open: returns.filter((r) => r.status !== "refunded" && r.status !== "rejected").length,
      refunded: returns.filter((r) => r.status === "refunded").length,
      totalRefunded:
        Math.round(
          returns.filter((r) => r.status === "refunded").reduce((s, r) => s + r.refundAmount, 0) *
            100
        ) / 100,
    }

    return NextResponse.json({ returns, meta })
  }
)
