import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled"

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

const MOCK_ORDERS: Order[] = [
  {
    id: "ord-031",
    ref: "CMD-0031",
    status: "processing",
    items: [
      {
        productId: "p-004",
        productName: "Bosch GSB 18V Li-Ion",
        category: "Scule",
        qty: 1,
        unitPrice: 210,
      },
      {
        productId: "p-006",
        productName: "Cabină duș 90×90 Cersanit",
        category: "Sanitare",
        qty: 1,
        unitPrice: 416,
      },
      {
        productId: "p-002",
        productName: "Parchet stejar 10mm",
        category: "Pardoseli",
        qty: 20,
        unitPrice: 28,
      },
    ],
    totalNet: 1186,
    totalVat: 225,
    totalGross: 1411,
    deliveryAddress: "Str. Fabricii 12, Cluj-Napoca",
    estimatedDelivery: "2026-06-13",
    placedAt: "2026-06-07T10:30:00Z",
  },
  {
    id: "ord-028",
    ref: "CMD-0028",
    status: "delivered",
    items: [
      {
        productId: "p-005",
        productName: "Tablou electric 24 module Hager",
        category: "Electrice",
        qty: 1,
        unitPrice: 94,
      },
    ],
    totalNet: 94,
    totalVat: 18,
    totalGross: 112,
    deliveryAddress: "Str. Fabricii 12, Cluj-Napoca",
    estimatedDelivery: "2026-06-03",
    placedAt: "2026-05-30T09:15:00Z",
  },
  {
    id: "ord-025",
    ref: "CMD-0025",
    status: "delivered",
    items: [
      {
        productId: "p-003",
        productName: "Baumit lavabilă interior 15L",
        category: "Vopsele",
        qty: 4,
        unitPrice: 42,
      },
      {
        productId: "p-009",
        productName: "Grund penetrant Ceresit CT17 25kg",
        category: "Vopsele",
        qty: 2,
        unitPrice: 36,
      },
    ],
    totalNet: 240,
    totalVat: 46,
    totalGross: 286,
    deliveryAddress: "Str. Fabricii 12, Cluj-Napoca",
    estimatedDelivery: "2026-05-23",
    placedAt: "2026-05-18T14:00:00Z",
    notes: "Livrați la recepție",
  },
]

export const GET = withGates(
  { action: "shop.orders.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as OrderStatus | null
    let orders = MOCK_ORDERS
    if (status) orders = orders.filter((o) => o.status === status)
    const processing = MOCK_ORDERS.filter(
      (o) => o.status === "processing" || o.status === "pending"
    )
    const delivered = MOCK_ORDERS.filter((o) => o.status === "delivered")
    const totalValue = MOCK_ORDERS.reduce((s, o) => s + o.totalGross, 0)
    return NextResponse.json({
      orders,
      count: orders.length,
      meta: {
        total: MOCK_ORDERS.length,
        processing: processing.length,
        delivered: delivered.length,
        totalValue,
      },
    })
  }
)

export const POST = withGates(
  { action: "shop.orders.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const { items, deliveryAddress, notes } = body

    const orderId = `ord-${Date.now()}`
    const ref = `CMD-${Math.floor(Math.random() * 900) + 100}`
    const today = new Date().toISOString()
    const delivery = new Date()
    delivery.setDate(delivery.getDate() + 5)

    const totalNet = (items ?? []).reduce(
      (s: number, i: { qty: number; unitPrice: number }) => s + i.qty * i.unitPrice,
      0
    )
    const totalVat = Math.round(totalNet * 0.19)
    const totalGross = totalNet + totalVat

    const newOrder: Order = {
      id: orderId,
      ref,
      status: "pending",
      items: items ?? [],
      totalNet: Math.round(totalNet),
      totalVat,
      totalGross,
      deliveryAddress: deliveryAddress ?? "",
      estimatedDelivery: delivery.toISOString().slice(0, 10),
      placedAt: today,
      notes,
    }

    await writeAuditLog({
      companyId: ctx.session.companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "shop.orders.create",
      entityType: "order",
      entityId: orderId,
      payload: {
        ref,
        itemCount: (items ?? []).length,
        totalGross: newOrder.totalGross,
        deliveryAddress,
      },
    })

    return NextResponse.json({ order: newOrder }, { status: 201 })
  }
)
