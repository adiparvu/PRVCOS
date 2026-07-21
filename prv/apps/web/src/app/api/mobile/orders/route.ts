import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { orders, orderItems } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull, count } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const lineItemSchema = z.object({
  name: z.string().min(1).max(500),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100).default(19),
})

const bodySchema = z.object({
  clientId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  currency: z.string().length(3).default("RON"),
  notes: z.string().max(2000).optional(),
  items: z.array(lineItemSchema).min(1).max(100),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { clientId, storeId, currency, notes, items } = parsed.data

  // Calculate totals
  let subtotal = 0
  let vatAmount = 0
  for (const item of items) {
    const lineSubtotal = item.qty * item.unitPrice
    subtotal += lineSubtotal
    vatAmount += lineSubtotal * (item.vatRate / 100)
  }
  subtotal = Math.round(subtotal * 100) / 100
  vatAmount = Math.round(vatAmount * 100) / 100
  const total = Math.round((subtotal + vatAmount) * 100) / 100

  // Generate next order number (ORD-YYYY-XXXX)
  const year = new Date().getFullYear().toString()
  const countResult = await db
    .select({ existingCount: count() })
    .from(orders)
    .where(and(eq(orders.companyId, ctx.companyId), isNull(orders.deletedAt)))
  const existingCount = countResult[0]?.existingCount ?? 0

  const seq = String(existingCount + 1).padStart(4, "0")
  const orderNumber = `ORD-${year}-${seq}`

  const [order] = await db
    .insert(orders)
    .values({
      companyId: ctx.companyId,
      clientId: clientId ?? null,
      storeId: storeId ?? null,
      orderNumber,
      status: "pending",
      subtotal: String(subtotal),
      vatAmount: String(vatAmount),
      total: String(total),
      currency: currency.toUpperCase(),
      notes: notes ?? null,
    })
    .returning({ id: orders.id, orderNumber: orders.orderNumber })

  if (!order) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }

  // Insert order items
  await db.insert(orderItems).values(
    items.map((item) => ({
      orderId: order.id,
      name: item.name,
      quantity: item.qty,
      unitPrice: String(item.unitPrice),
      vatRate: String(item.vatRate),
      total: String(Math.round(item.qty * item.unitPrice * (1 + item.vatRate / 100) * 100) / 100),
    }))
  )

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.order.create",
    entityType: "order",
    entityId: order.id,
    method: "POST",
    path: "/api/mobile/orders",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
  })

  return NextResponse.json(
    {
      id: order.id,
      orderNumber: order.orderNumber,
      status: "pending",
      total,
      currency: currency.toUpperCase(),
    },
    { status: 201 }
  )
})
