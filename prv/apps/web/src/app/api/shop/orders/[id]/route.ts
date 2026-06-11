import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { orders, orderItems } from "@prv/db/schema"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { appendRealtimeEvent, realtimeChannel, REALTIME_EVENT } from "@prv/cache"
import { inngest } from "@prv/jobs/client"
import type { Order, OrderStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Valid status transitions ──────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  refunded: [],
}

const DB_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "pending",
  confirmed: "processing",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "cancelled",
}

// ── GET /api/shop/orders/[id] ─────────────────────────────────────────────────

export const GET = withGates(
  { action: "shop.orders.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

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
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId), isNull(orders.deletedAt)))
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const lineItems = await db
      .select({
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        name: orderItems.name,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .limit(500)

    const addr = (row.shippingAddress ?? {}) as Record<string, unknown>
    const deliveryAddress =
      typeof addr.street === "string" ? [addr.street, addr.city].filter(Boolean).join(", ") : "—"

    const delivery = new Date(row.createdAt)
    delivery.setDate(delivery.getDate() + 5)

    const order: Order & { updatedAt: string } = {
      id: row.id,
      ref: row.orderNumber,
      status: DB_STATUS_MAP[row.status] ?? "pending",
      items: lineItems.map((it) => ({
        productId: it.productId ?? "",
        productName: it.name,
        category: it.sku ?? "—",
        qty: it.quantity,
        unitPrice: Number(it.unitPrice),
      })),
      totalNet: Number(row.subtotal),
      totalVat: Number(row.vatAmount),
      totalGross: Number(row.total),
      deliveryAddress,
      estimatedDelivery: delivery.toISOString().slice(0, 10),
      placedAt: row.createdAt.toISOString(),
      notes: row.notes ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
    }

    return NextResponse.json({ order })
  }
)

// ── PATCH /api/shop/orders/[id]/status ────────────────────────────────────────

export const PATCH = withGates(
  { action: "shop.orders.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const pathParts = req.nextUrl.pathname.split("/").filter(Boolean)
    // Path: /api/shop/orders/[id] — last segment is the id
    const id = pathParts[pathParts.length - 1] ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const body = (await req.json().catch(() => ({}))) as { status?: string; notes?: string }
    const { status: newStatus, notes } = body

    if (!newStatus) {
      return NextResponse.json({ error: "status required" }, { status: 400 })
    }

    const [existing] = await db
      .select({ id: orders.id, status: orders.status, orderNumber: orders.orderNumber })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId), isNull(orders.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? []

    if (!allowed.includes(newStatus as OrderStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from '${existing.status}' to '${newStatus}'`, allowed },
        { status: 409 }
      )
    }

    const dbNewStatus = newStatus

    const [updated] = await db
      .update(orders)
      .set({
        status: dbNewStatus as typeof existing.status,
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId)))
      .returning({ id: orders.id, status: orders.status, orderNumber: orders.orderNumber })

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.orders.status_update",
      entityType: "order",
      entityId: id,
      payload: { ref: existing.orderNumber, from: existing.status, to: dbNewStatus },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    void appendRealtimeEvent(realtimeChannel.shop(companyId), REALTIME_EVENT.SHOP_UPDATE, {
      entityType: "order",
      entityId: id,
      action: "updated",
      companyId,
    }).catch(() => null)

    // Trigger background order-processing job for actionable status changes
    void inngest
      .send({
        name: "prv/shop.order.status_changed",
        data: {
          orderId: id,
          companyId,
          orderNumber: existing.orderNumber,
          fromStatus: existing.status,
          toStatus: dbNewStatus,
        },
      })
      .catch(() => null)

    return NextResponse.json({ id, status: updated?.status, orderNumber: updated?.orderNumber })
  }
)

// ── DELETE /api/shop/orders/[id] (soft-delete) ───────────────────────────────

export const DELETE = withGates(
  { action: "shop.orders.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: orders.id, status: orders.status, orderNumber: orders.orderNumber })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId), isNull(orders.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!["cancelled", "refunded"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Only cancelled or refunded orders can be deleted" },
        { status: 409 }
      )
    }

    await db
      .update(orders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId)))

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.orders.delete",
      entityType: "order",
      entityId: id,
      payload: { ref: existing.orderNumber },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
