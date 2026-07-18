import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import {
  goodsReceiptNotes,
  grnItems,
  purchaseOrders,
  purchaseOrderItems,
  products,
} from "@prv/db/schema"
import { and, asc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function extractIds(req: NextRequest): { poId: string; grnId: string } {
  // path: /api/procurement/[id]/grn/[grnId]
  const parts = req.nextUrl.pathname.split("/")
  const grnIdx = parts.indexOf("grn")
  const poId = grnIdx > 0 ? (parts[grnIdx - 1] ?? "") : ""
  const grnId = parts[grnIdx + 1] ?? ""
  return { poId, grnId }
}

type MatchStatus = "matched" | "partial_match" | "discrepancy" | "pending"

function computeMatchStatus(
  items: Array<{ orderedQty: string; receivedQty: string; condition: string }>
): MatchStatus {
  if (items.length === 0) return "pending"

  const hasRejected = items.some((i) => i.condition === "rejected")
  const hasDamaged = items.some((i) => i.condition === "damaged")

  const allFullyReceived = items.every(
    (i) => Math.abs(Number(i.receivedQty) - Number(i.orderedQty)) < 0.001
  )
  const anyReceived = items.some((i) => Number(i.receivedQty) > 0)

  if (hasRejected || hasDamaged) return "discrepancy"
  if (allFullyReceived) return "matched"
  if (anyReceived) return "partial_match"
  return "discrepancy"
}

// ── GET /api/procurement/[id]/grn/[grnId] ────────────────────────────────────

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { poId, grnId } = extractIds(req)
    if (!poId || !grnId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const { companyId } = ctx.session

    const [grn] = await db
      .select({
        id: goodsReceiptNotes.id,
        grnRef: goodsReceiptNotes.grnRef,
        purchaseOrderId: goodsReceiptNotes.purchaseOrderId,
        receivedDate: goodsReceiptNotes.receivedDate,
        status: goodsReceiptNotes.status,
        matchStatus: goodsReceiptNotes.matchStatus,
        notes: goodsReceiptNotes.notes,
        createdAt: goodsReceiptNotes.createdAt,
        updatedAt: goodsReceiptNotes.updatedAt,
      })
      .from(goodsReceiptNotes)
      .where(
        and(
          eq(goodsReceiptNotes.id, grnId),
          eq(goodsReceiptNotes.purchaseOrderId, poId),
          eq(goodsReceiptNotes.companyId, companyId)
        )
      )
      .limit(1)

    if (!grn) return NextResponse.json({ error: "GRN not found" }, { status: 404 })

    const items = await db
      .select({
        id: grnItems.id,
        purchaseOrderItemId: grnItems.purchaseOrderItemId,
        description: grnItems.description,
        orderedQty: grnItems.orderedQty,
        receivedQty: grnItems.receivedQty,
        unit: grnItems.unit,
        condition: grnItems.condition,
        notes: grnItems.notes,
        sortOrder: grnItems.sortOrder,
      })
      .from(grnItems)
      .where(eq(grnItems.grnId, grnId))
      .orderBy(asc(grnItems.sortOrder))

    return NextResponse.json({
      grn: {
        ...grn,
        createdAt: grn.createdAt.toISOString(),
        updatedAt: grn.updatedAt.toISOString(),
        items: items.map((i) => ({
          ...i,
          orderedQty: Number(i.orderedQty),
          receivedQty: Number(i.receivedQty),
        })),
      },
    })
  }
)

// ── PATCH /api/procurement/[id]/grn/[grnId] (confirm) ────────────────────────

export const PATCH = withGates(
  { action: "procurement.approve", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { poId, grnId } = extractIds(req)
    if (!poId || !grnId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const [grn] = await db
      .select({ id: goodsReceiptNotes.id, status: goodsReceiptNotes.status })
      .from(goodsReceiptNotes)
      .where(
        and(
          eq(goodsReceiptNotes.id, grnId),
          eq(goodsReceiptNotes.purchaseOrderId, poId),
          eq(goodsReceiptNotes.companyId, companyId)
        )
      )
      .limit(1)

    if (!grn) return NextResponse.json({ error: "GRN not found" }, { status: 404 })

    if (grn.status !== "draft" && grn.status !== "partial") {
      return NextResponse.json(
        { error: "Can only confirm a draft or partial GRN" },
        { status: 409 }
      )
    }

    // Recompute match status from current items
    const items = await db
      .select({
        orderedQty: grnItems.orderedQty,
        receivedQty: grnItems.receivedQty,
        condition: grnItems.condition,
        ref: purchaseOrderItems.ref,
      })
      .from(grnItems)
      .leftJoin(purchaseOrderItems, eq(grnItems.purchaseOrderItemId, purchaseOrderItems.id))
      .where(eq(grnItems.grnId, grnId))

    const matchStatus = computeMatchStatus(items)

    await db
      .update(goodsReceiptNotes)
      .set({ status: "confirmed", matchStatus, updatedAt: new Date() })
      .where(and(eq(goodsReceiptNotes.id, grnId), eq(goodsReceiptNotes.companyId, companyId)))

    // If fully matched, update PO to received
    if (matchStatus === "matched") {
      await db
        .update(purchaseOrders)
        .set({ status: "received", updatedAt: new Date() })
        .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.companyId, companyId)))
    }

    // Post received goods to inventory (Phase 21.4): add the received quantity
    // of each accepted line to the matching product's stock, keyed by SKU (the
    // PO line ref). Best-effort — lines with no SKU match are left for manual
    // receiving. Runs once, since a GRN can only be confirmed out of draft.
    for (const line of items) {
      if (line.condition !== "good" || !line.ref) continue
      const qty = Math.round(Number(line.receivedQty))
      if (!Number.isFinite(qty) || qty <= 0) continue
      const [product] = await db
        .select({ id: products.id, stockQuantity: products.stockQuantity })
        .from(products)
        .where(and(eq(products.companyId, companyId), eq(products.sku, line.ref)))
        .limit(1)
      if (!product) continue
      await db
        .update(products)
        .set({ stockQuantity: product.stockQuantity + qty, updatedAt: new Date() })
        .where(eq(products.id, product.id))
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "procurement.grn.confirm",
      entityType: "goods_receipt_note",
      entityId: grnId,
      payload: { poId, matchStatus, from: grn.status, to: "confirmed" },
      method: "PATCH",
      path: "/api/procurement/" + poId + "/grn/" + grnId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: grnId, status: "confirmed", matchStatus })
  }
)
