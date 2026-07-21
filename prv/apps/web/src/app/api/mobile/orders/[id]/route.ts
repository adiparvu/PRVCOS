import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { orders, orderItems, clients, stores, users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { appendRealtimeEvent, realtimeChannel, REALTIME_EVENT } from "@prv/cache"
import { inngest } from "@prv/jobs/client"
import { eq, and, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "RON" ? "RON " : currency === "EUR" ? "€" : `${currency} `
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(2)}k`
  return `${symbol}${amount.toFixed(2)}`
}

const STATUS_STEPS: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
  refunded: -1,
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const orderId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 })
  }

  const [orderRow] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      subtotal: orders.subtotal,
      vatAmount: orders.vatAmount,
      total: orders.total,
      currency: orders.currency,
      notes: orders.notes,
      clientId: orders.clientId,
      storeId: orders.storeId,
      assignedUserId: orders.assignedUserId,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(
      and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId), isNull(orders.deletedAt))
    )
    .limit(1)

  if (!orderRow) {
    return NextResponse.json({ error: "Order not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const [itemRows, clientRow, storeRow, assignedRow] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        name: orderItems.name,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        vatRate: orderItems.vatRate,
        total: orderItems.total,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId)),

    orderRow.clientId
      ? db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.id, orderRow.clientId))
          .limit(1)
      : Promise.resolve([]),

    orderRow.storeId
      ? db
          .select({ name: stores.name, city: stores.city })
          .from(stores)
          .where(eq(stores.id, orderRow.storeId))
          .limit(1)
      : Promise.resolve([]),

    orderRow.assignedUserId
      ? db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, orderRow.assignedUserId))
          .limit(1)
      : Promise.resolve([]),
  ])

  const currency = orderRow.currency
  const storeDisplay = storeRow[0]
    ? storeRow[0].city
      ? `${storeRow[0].name} — ${storeRow[0].city}`
      : storeRow[0].name
    : null

  return NextResponse.json({
    order: {
      id: orderRow.id,
      orderNumber: orderRow.orderNumber,
      status: orderRow.status,
      statusStep: STATUS_STEPS[orderRow.status] ?? 0,
      subtotal: formatCurrency(Number(orderRow.subtotal), currency),
      vatAmount: formatCurrency(Number(orderRow.vatAmount), currency),
      total: formatCurrency(Number(orderRow.total), currency),
      subtotalRaw: Number(orderRow.subtotal),
      vatAmountRaw: Number(orderRow.vatAmount),
      totalRaw: Number(orderRow.total),
      currency,
      notes: orderRow.notes ?? null,
      createdAt: orderRow.createdAt,
      updatedAt: orderRow.updatedAt,
    },
    client: clientRow[0] ? { id: clientRow[0].id, name: clientRow[0].name } : null,
    store: storeDisplay,
    assignedTo: assignedRow[0]
      ? {
          id: assignedRow[0].id,
          name: `${assignedRow[0].firstName} ${assignedRow[0].lastName}`,
        }
      : null,
    items: itemRows.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku ?? null,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      unitPriceFormatted: formatCurrency(Number(item.unitPrice), currency),
      vatRate: Number(item.vatRate),
      total: Number(item.total),
      totalFormatted: formatCurrency(Number(item.total), currency),
    })),
  })
})

const patchOrderSchema = z
  .object({
    status: z
      .enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"])
      .optional(),
    notes: z.string().nullable().optional(),
  })
  .refine((d) => d.status !== undefined || d.notes !== undefined, {
    message: "At least one field required",
  })

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const orderId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { status, notes } = parsed.data

  const [existing] = await db
    .select({ id: orders.id, status: orders.status, orderNumber: orders.orderNumber })
    .from(orders)
    .where(
      and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId), isNull(orders.deletedAt))
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  // Enforce the same order-lifecycle state machine as the web sibling
  // (shop/orders/[id]); without it mobile could move a terminal order back
  // (e.g. delivered -> pending), corrupting the lifecycle. Keep in sync.
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
    refunded: [],
  }
  if (status !== undefined) {
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${existing.status}' to '${status}'`, allowed },
        { status: 409 }
      )
    }
  }

  const [updated] = await db
    .update(orders)
    .set({
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id, status: orders.status })

  if (!updated) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.order.status_update",
    entityType: "order",
    entityId: orderId,
    method: "PATCH",
    path: `/api/mobile/orders/${orderId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { from: existing.status, to: status ?? existing.status },
  })

  // Parity with the web sibling: on a status change, push a realtime shop event
  // and trigger the order-processing job so mobile-driven transitions fire the
  // same automations as web.
  if (status !== undefined && status !== existing.status) {
    void appendRealtimeEvent(realtimeChannel.shop(ctx.companyId), REALTIME_EVENT.SHOP_UPDATE, {
      entityType: "order",
      entityId: orderId,
      action: "updated",
      companyId: ctx.companyId,
    }).catch(() => null)
    void inngest
      .send({
        name: "prv/shop.order.status_changed",
        data: {
          orderId,
          companyId: ctx.companyId,
          orderNumber: existing.orderNumber,
          fromStatus: existing.status,
          toStatus: status,
        },
      })
      .catch(() => null)
  }

  return NextResponse.json({ id: updated.id, status: updated.status })
})

// ─── DELETE /api/mobile/orders/[id] ──────────────────────────────────────────

export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const orderId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!orderId) return NextResponse.json({ error: "Missing order ID" }, { status: 400 })

  const [existing] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(
      and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId), isNull(orders.deletedAt))
    )
    .limit(1)

  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  if (!["cancelled", "refunded"].includes(existing.status))
    return NextResponse.json(
      { error: `Cannot delete an order with status '${existing.status}'` },
      { status: 409 }
    )

  await db
    .update(orders)
    .set({ deletedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.companyId, ctx.companyId)))

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.order.delete",
    entityType: "order",
    entityId: orderId,
    method: "DELETE",
    path: `/api/mobile/orders/${orderId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: {},
  })

  return new NextResponse(null, { status: 204 })
})
