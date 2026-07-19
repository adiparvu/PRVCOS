import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { orders, orderItems, products } from "@prv/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { checkRateLimit } from "@prv/cache"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Public storefront checkout (Phase 23.2). Unauthenticated: a visitor places an
// order from their cart. The company is derived from the cart's products (all
// items must belong to one store). Creates a pending order for staff to confirm
// — no stock mutation and no payment (Stripe is a separate sprint).
const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
      })
    )
    .min(1)
    .max(100),
  customer: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().max(254),
    phone: z.string().max(32).optional(),
    address: z.string().max(500).optional(),
  }),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rl = await checkRateLimit("public", `public_checkout:${ip}`)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid order", issues: parsed.error.issues },
      { status: 422 }
    )
  }
  const { items, customer } = parsed.data

  const productIds = [...new Set(items.map((i) => i.productId))]
  const rows = await db
    .select({
      id: products.id,
      companyId: products.companyId,
      name: products.name,
      sku: products.sku,
      price: products.price,
    })
    .from(products)
    .where(
      and(
        inArray(products.id, productIds),
        eq(products.status, "active"),
        eq(products.isActive, true)
      )
    )
  const byId = new Map(rows.map((r) => [r.id, r]))

  if (productIds.some((id) => !byId.has(id))) {
    return NextResponse.json({ error: "Some products are no longer available" }, { status: 409 })
  }
  const companyIds = new Set(rows.map((r) => r.companyId))
  if (companyIds.size !== 1) {
    return NextResponse.json({ error: "All items must be from the same store" }, { status: 400 })
  }
  const companyId = rows[0]!.companyId

  const lines = items.map((i) => {
    const p = byId.get(i.productId)!
    const unitPrice = Number(p.price)
    return { product: p, quantity: i.quantity, unitPrice, total: unitPrice * i.quantity }
  })
  const subtotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100
  const vatAmount = Math.round(subtotal * 0.19 * 100) / 100
  const total = Math.round((subtotal + vatAmount) * 100) / 100

  const orderNumber = `CMD-${Date.now()}`

  const [order] = await db
    .insert(orders)
    .values({
      companyId,
      clientId: null,
      orderNumber,
      status: "pending",
      subtotal: String(subtotal),
      vatAmount: String(vatAmount),
      total: String(total),
      shippingAddress: customer.address ? { street: customer.address } : null,
      metadata: {
        channel: "public_web",
        guest: { name: customer.name, email: customer.email, phone: customer.phone ?? null },
      },
    })
    .returning({ id: orders.id, orderNumber: orders.orderNumber })

  if (!order) return NextResponse.json({ error: "Could not place order" }, { status: 500 })

  await db.insert(orderItems).values(
    lines.map((l) => ({
      orderId: order.id,
      productId: l.product.id,
      name: l.product.name,
      sku: l.product.sku ?? null,
      quantity: l.quantity,
      unitPrice: String(l.unitPrice),
      vatRate: "19",
      total: String(l.total),
    }))
  )

  // Return the order reference for the confirmation screen; no internal id.
  return NextResponse.json({ ok: true, orderNumber: order.orderNumber, total }, { status: 201 })
}
