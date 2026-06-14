import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { purchaseOrders, purchaseOrderItems } from "@prv/db/schema"
import { and, asc, eq, isNull, max } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function poId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

async function verifyPO(
  id: string,
  companyId: string
): Promise<{ id: string; status: string } | null> {
  const [row] = await db
    .select({ id: purchaseOrders.id, status: purchaseOrders.status })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.companyId, companyId),
        isNull(purchaseOrders.deletedAt)
      )
    )
    .limit(1)
  return row ?? null
}

// ─── GET /api/procurement/[id]/items ─────────────────────────────────────────

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = poId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const po = await verifyPO(id, ctx.session.companyId)
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })

    const rows = await db
      .select({
        id: purchaseOrderItems.id,
        description: purchaseOrderItems.description,
        ref: purchaseOrderItems.ref,
        unit: purchaseOrderItems.unit,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        total: purchaseOrderItems.total,
        sortOrder: purchaseOrderItems.sortOrder,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id))
      .orderBy(asc(purchaseOrderItems.sortOrder))

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        description: r.description,
        ref: r.ref,
        unit: r.unit,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
        total: Number(r.total),
        sortOrder: r.sortOrder,
      })),
    })
  }
)

// ─── POST /api/procurement/[id]/items ────────────────────────────────────────

const itemSchema = z.object({
  description: z.string().min(1),
  ref: z.string().max(100).optional(),
  unit: z.string().max(50).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const POST = withGates(
  { action: "procurement.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = poId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const po = await verifyPO(id, companyId)
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })

    if (!["draft", "pending"].includes(po.status)) {
      return NextResponse.json(
        { error: `Cannot add items to a PO with status '${po.status}'` },
        { status: 409 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = itemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    let sortOrder = parsed.data.sortOrder
    if (sortOrder === undefined) {
      const [maxRow] = await db
        .select({ maxOrder: max(purchaseOrderItems.sortOrder) })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, id))
      sortOrder = (maxRow?.maxOrder ?? -1) + 1
    }

    const total = parsed.data.quantity * parsed.data.unitPrice

    const [record] = await db
      .insert(purchaseOrderItems)
      .values({
        purchaseOrderId: id,
        description: parsed.data.description,
        ref: parsed.data.ref,
        unit: parsed.data.unit ?? "buc",
        quantity: String(parsed.data.quantity),
        unitPrice: String(parsed.data.unitPrice),
        total: String(total),
        sortOrder,
      })
      .returning({ id: purchaseOrderItems.id })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    // Recalculate PO total from items
    const allItems = await db
      .select({ total: purchaseOrderItems.total })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id))

    const newTotal = allItems.reduce((sum, i) => sum + Number(i.total), 0)

    await db
      .update(purchaseOrders)
      .set({ amount: String(newTotal), updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "procurement.item.create",
      entityType: "purchase_order",
      entityId: id,
      payload: { itemId: record.id, ...parsed.data },
      method: "POST",
      path: `/api/procurement/${id}/items`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, total: newTotal }, { status: 201 })
  }
)

// ─── DELETE /api/procurement/[id]/items?itemId=… ─────────────────────────────

export const DELETE = withGates(
  { action: "procurement.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = poId(req)
    const itemId = new URL(req.url).searchParams.get("itemId")
    if (!id || !itemId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const po = await verifyPO(id, companyId)
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })

    if (!["draft", "pending"].includes(po.status)) {
      return NextResponse.json(
        { error: `Cannot remove items from a PO with status '${po.status}'` },
        { status: 409 }
      )
    }

    await db
      .delete(purchaseOrderItems)
      .where(and(eq(purchaseOrderItems.id, itemId), eq(purchaseOrderItems.purchaseOrderId, id)))

    const remaining = await db
      .select({ total: purchaseOrderItems.total })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id))

    const newTotal = remaining.reduce((sum, i) => sum + Number(i.total), 0)

    await db
      .update(purchaseOrders)
      .set({ amount: String(newTotal), updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "procurement.item.delete",
      entityType: "purchase_order",
      entityId: id,
      payload: { itemId },
      method: "DELETE",
      path: `/api/procurement/${id}/items`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ total: newTotal })
  }
)
