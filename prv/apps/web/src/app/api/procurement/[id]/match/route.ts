import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import {
  purchaseOrders,
  purchaseOrderItems,
  goodsReceiptNotes,
  grnItems,
  supplierInvoices,
} from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import {
  evaluateThreeWayMatch,
  DEFAULT_PRICE_TOLERANCE,
  type ThreeWayMatchStatus,
} from "@/lib/three-way-match"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// path: /api/procurement/[id]/match
function poId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const i = parts.indexOf("match")
  return i > 0 ? (parts[i - 1] ?? "") : ""
}

const num = (v: string | null): number => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const matchSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  tolerance: z.number().min(0).max(1).optional(),
})

// ── POST /api/procurement/[id]/match ──────────────────────────────────────────
// Reconcile a supplier invoice against its purchase order and goods-receipt note
// (3-way match), persisting the outcome and price variance on the invoice.

export const POST = withGates(
  { action: "procurement.approve", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = poId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = matchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }
    const tolerance = parsed.data.tolerance ?? DEFAULT_PRICE_TOLERANCE

    // Purchase order must exist within the company.
    const [po] = await db
      .select({ id: purchaseOrders.id, poRef: purchaseOrders.ref })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, companyId),
          isNull(purchaseOrders.deletedAt)
        )
      )
      .limit(1)
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })

    // Latest goods-receipt note for the PO — the receipt we match against.
    const [grn] = await db
      .select({ id: goodsReceiptNotes.id, matchStatus: goodsReceiptNotes.matchStatus })
      .from(goodsReceiptNotes)
      .where(
        and(eq(goodsReceiptNotes.purchaseOrderId, id), eq(goodsReceiptNotes.companyId, companyId))
      )
      .orderBy(desc(goodsReceiptNotes.receivedDate))
      .limit(1)
    if (!grn) {
      return NextResponse.json({ error: "No goods receipt to match against" }, { status: 409 })
    }

    // The supplier invoice: an explicit one if given, else the latest for this PO.
    const invoiceWhere = parsed.data.invoiceId
      ? and(
          eq(supplierInvoices.id, parsed.data.invoiceId),
          eq(supplierInvoices.companyId, companyId),
          eq(supplierInvoices.purchaseOrderId, id)
        )
      : and(eq(supplierInvoices.purchaseOrderId, id), eq(supplierInvoices.companyId, companyId))
    const [invoice] = await db
      .select({ id: supplierInvoices.id, amount: supplierInvoices.amount })
      .from(supplierInvoices)
      .where(invoiceWhere)
      .orderBy(desc(supplierInvoices.createdAt))
      .limit(1)
    if (!invoice) {
      return NextResponse.json({ error: "No supplier invoice to match" }, { status: 409 })
    }

    // Value of goods actually received: Σ(receivedQty × PO line unit price).
    const poLines = await db
      .select({ id: purchaseOrderItems.id, unitPrice: purchaseOrderItems.unitPrice })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id))
    const unitPriceByItem = new Map(poLines.map((l) => [l.id, num(l.unitPrice)]))

    const receipt = await db
      .select({
        purchaseOrderItemId: grnItems.purchaseOrderItemId,
        receivedQty: grnItems.receivedQty,
        condition: grnItems.condition,
      })
      .from(grnItems)
      .where(eq(grnItems.grnId, grn.id))

    let expectedValue = 0
    let hasRejectedOrDamaged = false
    for (const line of receipt) {
      if (line.condition === "rejected" || line.condition === "damaged") hasRejectedOrDamaged = true
      const price = line.purchaseOrderItemId
        ? (unitPriceByItem.get(line.purchaseOrderItemId) ?? 0)
        : 0
      expectedValue += num(line.receivedQty) * price
    }
    expectedValue = Math.round(expectedValue * 100) / 100

    const result = evaluateThreeWayMatch({
      expectedValue,
      invoiceAmount: num(invoice.amount),
      quantityFullyReceived: grn.matchStatus === "matched",
      hasRejectedOrDamaged,
      tolerance,
    })

    await db
      .update(supplierInvoices)
      .set({
        grnId: grn.id,
        matchStatus: result.status,
        matchVariance: result.priceVariance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(and(eq(supplierInvoices.id, invoice.id), eq(supplierInvoices.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "procurement.invoice.match",
      entityType: "supplier_invoice",
      entityId: invoice.id,
      payload: {
        poRef: po.poRef,
        grnId: grn.id,
        status: result.status,
        expectedValue,
        invoiceAmount: num(invoice.amount),
        priceVariance: result.priceVariance,
        tolerance,
      },
      method: "POST",
      path: `/api/procurement/${id}/match`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    const status: ThreeWayMatchStatus = result.status
    return NextResponse.json({
      invoiceId: invoice.id,
      grnId: grn.id,
      status,
      expectedValue,
      invoiceAmount: num(invoice.amount),
      priceVariance: result.priceVariance,
      priceVariancePct: result.priceVariancePct,
      withinTolerance: result.withinTolerance,
    })
  }
)
