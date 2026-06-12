import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { orders, orderItems } from "@prv/db/schema"
import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm"
import { appendRealtimeEvent, realtimeChannel, REALTIME_EVENT } from "@prv/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

export interface OrderLineItem {
  productId: string
  productName: string
  category: string
  qty: number
  unitPrice: number
}

export interface Order {
  id: string
  ref: string
  status: OrderStatus
  items: OrderLineItem[]
  totalNet: number
  totalVat: number
  totalGross: number
  deliveryAddress: string
  estimatedDelivery: string
  placedAt: string
  notes?: string
}

const DB_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "pending",
  confirmed: "confirmed",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
}

export const GET = withGates(
  { action: "shop.orders.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") as OrderStatus | null
    const { companyId } = ctx.session

    const rawLimit = parseInt(searchParams.get("limit") ?? "25", 10)
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 25 : rawLimit, 100)
    const cursor = searchParams.get("cursor")

    const conditions = [eq(orders.companyId, companyId), isNull(orders.deletedAt)]
    if (cursor) conditions.push(lt(orders.createdAt, new Date(cursor)))

    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        subtotal: orders.subtotal,
        vatAmount: orders.vatAmount,
        total: orders.total,
        shippingAddress: orders.shippingAddress,
        notes: orders.notes,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1]!.createdAt.toISOString() : null

    const orderIds = items.map((r) => r.id)
    const allItems =
      orderIds.length > 0
        ? await db
            .select({
              orderId: orderItems.orderId,
              productId: orderItems.productId,
              name: orderItems.name,
              sku: orderItems.sku,
              quantity: orderItems.quantity,
              unitPrice: orderItems.unitPrice,
            })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : []

    const itemsByOrder: Record<string, typeof allItems> = {}
    for (const item of allItems) {
      if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = []
      itemsByOrder[item.orderId]!.push(item)
    }

    let result: Order[] = items.map((r) => {
      const addr = (r.shippingAddress ?? {}) as Record<string, unknown>
      const deliveryAddress =
        typeof addr.street === "string" ? [addr.street, addr.city].filter(Boolean).join(", ") : "—"

      const delivery = new Date(r.createdAt)
      delivery.setDate(delivery.getDate() + 5)

      const lineItems: OrderLineItem[] = (itemsByOrder[r.id] ?? []).map((it) => ({
        productId: it.productId ?? "",
        productName: it.name,
        category: it.sku ?? "—",
        qty: it.quantity,
        unitPrice: Number(it.unitPrice),
      }))

      const apiStatus = DB_STATUS_MAP[r.status] ?? "pending"
      return {
        id: r.id,
        ref: r.orderNumber,
        status: apiStatus,
        items: lineItems,
        totalNet: Number(r.subtotal),
        totalVat: Number(r.vatAmount),
        totalGross: Number(r.total),
        deliveryAddress,
        estimatedDelivery: delivery.toISOString().slice(0, 10),
        placedAt: r.createdAt.toISOString(),
        notes: r.notes ?? undefined,
      }
    })

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter)
    }

    const processing = result.filter((o) => o.status === "processing" || o.status === "pending")
    const delivered = result.filter((o) => o.status === "delivered")
    const totalValue = result.reduce((s, o) => s + o.totalGross, 0)

    return NextResponse.json({
      orders: result,
      count: result.length,
      meta: {
        total: result.length,
        processing: processing.length,
        delivered: delivered.length,
        totalValue,
      },
      nextCursor,
      hasMore,
    })
  }
)

export const POST = withGates(
  { action: "shop.orders.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const { items, deliveryAddress, notes, clientId } = body

    const { companyId, userId } = ctx.session
    const ref = `CMD-${Date.now()}`

    const lineItems = (items ?? []) as Array<{
      productId?: string
      productName: string
      qty: number
      unitPrice: number
      category?: string
    }>

    const totalNet = lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0)
    const totalVat = Math.round(totalNet * 0.19 * 100) / 100
    const totalGross = totalNet + totalVat

    const delivery = new Date()
    delivery.setDate(delivery.getDate() + 5)

    const shippingAddr =
      typeof deliveryAddress === "string" ? { street: deliveryAddress } : (deliveryAddress ?? {})

    const [inserted] = await db
      .insert(orders)
      .values({
        companyId,
        clientId: clientId ?? null,
        orderNumber: ref,
        status: "pending",
        subtotal: String(totalNet),
        vatAmount: String(totalVat),
        total: String(totalGross),
        shippingAddress: shippingAddr,
        notes: notes ?? null,
      })
      .returning()

    if (!inserted) return NextResponse.json({ error: "Database error" }, { status: 500 })

    if (lineItems.length > 0) {
      await db.insert(orderItems).values(
        lineItems.map((it) => ({
          orderId: inserted.id,
          productId: it.productId ?? null,
          name: it.productName ?? "Item",
          sku: it.category ?? null,
          quantity: it.qty,
          unitPrice: String(it.unitPrice),
          vatRate: "19",
          total: String(it.qty * it.unitPrice),
        }))
      )
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.orders.create",
      entityType: "order",
      entityId: inserted.id,
      payload: {
        ref,
        itemCount: lineItems.length,
        totalGross,
        deliveryAddress,
      },
    })

    const newOrder: Order = {
      id: inserted.id,
      ref: inserted.orderNumber,
      status: "pending",
      items: lineItems.map((it) => ({
        productId: it.productId ?? "",
        productName: it.productName ?? "Item",
        category: it.category ?? "—",
        qty: it.qty,
        unitPrice: it.unitPrice,
      })),
      totalNet: Math.round(totalNet),
      totalVat: Math.round(totalVat),
      totalGross: Math.round(totalGross),
      deliveryAddress: typeof deliveryAddress === "string" ? deliveryAddress : "",
      estimatedDelivery: delivery.toISOString().slice(0, 10),
      placedAt: inserted.createdAt.toISOString(),
      notes,
    }

    void appendRealtimeEvent(realtimeChannel.shop(companyId), REALTIME_EVENT.SHOP_UPDATE, {
      entityType: "order",
      entityId: inserted.id,
      action: "created",
      companyId,
    }).catch(() => null)

    return NextResponse.json({ order: newOrder }, { status: 201 })
  }
)
