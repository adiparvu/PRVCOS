import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { orderReturns, orderReturnItems, orders } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computeRefund } from "@/lib/returns"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const REASONS = ["damaged", "wrong_item", "defective", "not_needed", "other"] as const

function orderId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

// POST /api/shop/orders/[id]/returns — open a return against an order with the
// returned line items; the refund amount is derived from the items.
const postSchema = z.object({
  reason: z.enum(REASONS).default("other"),
  restock: z.boolean().default(true),
  notes: z.string().max(2000).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().nullable().optional(),
        name: z.string().min(1).max(255),
        quantity: z.number().int().min(1).max(1_000_000),
        unitPrice: z.number().min(0).max(100_000_000),
      })
    )
    .min(1),
})

export const POST = withGates(
  { action: "shop.orders.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const oid = orderId(req)
    if (!oid) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, oid), eq(orders.companyId, companyId)))
      .limit(1)
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data
    const refund = computeRefund(d.items)
    const returnNumber = `RET-${Date.now().toString(36).toUpperCase()}`

    const [record] = await db
      .insert(orderReturns)
      .values({
        companyId,
        orderId: oid,
        returnNumber,
        reason: d.reason,
        restock: d.restock,
        refundAmount: refund.toFixed(2),
        notes: d.notes ?? null,
        createdById: actorId,
      })
      .returning({ id: orderReturns.id })

    if (record) {
      await db.insert(orderReturnItems).values(
        d.items.map((it) => ({
          companyId,
          returnId: record.id,
          productId: it.productId ?? null,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice.toFixed(2),
          lineTotal: (it.quantity * it.unitPrice).toFixed(2),
        }))
      )
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.orders.return.create",
      entityType: "order_return",
      entityId: record?.id ?? oid,
      payload: { orderId: oid, returnNumber, refund },
      method: "POST",
      path: `/api/shop/orders/${oid}/returns`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id, returnNumber, refund }, { status: 201 })
  }
)
