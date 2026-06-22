import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { goodsReceiptNotes, grnItems, purchaseOrders, purchaseOrderItems } from "@prv/db/schema"
import { and, asc, count, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function poId(req: NextRequest): string {
  // path: /api/procurement/[id]/grn
  const parts = req.nextUrl.pathname.split("/")
  const grnIdx = parts.indexOf("grn")
  return grnIdx > 0 ? (parts[grnIdx - 1] ?? "") : ""
}

async function verifyPO(id: string, companyId: string) {
  const [row] = await db
    .select({
      id: purchaseOrders.id,
      status: purchaseOrders.status,
      supplierId: purchaseOrders.supplierId,
      neededBy: purchaseOrders.neededBy,
    })
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

// ── GET /api/procurement/[id]/grn ────────────────────────────────────────────

export const GET = withGates(
  { action: "procurement.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = poId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const po = await verifyPO(id, companyId)
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })

    const grns = await db
      .select({
        id: goodsReceiptNotes.id,
        grnRef: goodsReceiptNotes.grnRef,
        receivedDate: goodsReceiptNotes.receivedDate,
        status: goodsReceiptNotes.status,
        matchStatus: goodsReceiptNotes.matchStatus,
        notes: goodsReceiptNotes.notes,
        createdAt: goodsReceiptNotes.createdAt,
        updatedAt: goodsReceiptNotes.updatedAt,
      })
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.purchaseOrderId, id))
      .orderBy(asc(goodsReceiptNotes.createdAt))

    return NextResponse.json({ grns })
  }
)

// ── POST /api/procurement/[id]/grn ───────────────────────────────────────────

const grnItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid().optional(),
  description: z.string().min(1),
  orderedQty: z.number().positive(),
  receivedQty: z.number().nonnegative(),
  unit: z.string().max(50).optional(),
  condition: z.enum(["good", "damaged", "rejected"]),
  notes: z.string().optional(),
})

const createGrnSchema = z.object({
  receivedDate: z.string().min(1).max(10),
  notes: z.string().optional(),
  items: z.array(grnItemSchema).min(1),
})

type MatchStatus = "matched" | "partial_match" | "discrepancy" | "pending"

function computeMatchStatus(
  items: Array<{ orderedQty: number; receivedQty: number; condition: string }>
): MatchStatus {
  if (items.length === 0) return "pending"

  const hasRejected = items.some((i) => i.condition === "rejected")
  const hasDamaged = items.some((i) => i.condition === "damaged")

  const allFullyReceived = items.every((i) => Math.abs(i.receivedQty - i.orderedQty) < 0.001)
  const anyReceived = items.some((i) => i.receivedQty > 0)

  if (hasRejected || hasDamaged) return "discrepancy"
  if (allFullyReceived) return "matched"
  if (anyReceived) return "partial_match"
  return "discrepancy"
}

export const POST = withGates(
  { action: "procurement.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = poId(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const po = await verifyPO(id, companyId)
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })

    if (!["approved", "in_transit", "received"].includes(po.status)) {
      return NextResponse.json(
        { error: "Can only create GRN for approved or in-transit POs" },
        { status: 409 }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createGrnSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    // Generate sequential GRN ref
    const year = new Date().getFullYear()
    const [countRow] = await db
      .select({ n: count() })
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.companyId, companyId))

    const seq = (Number(countRow?.n ?? 0) + 1).toString().padStart(4, "0")
    const grnRef = "GRN-" + year + "-" + seq

    // Compute match status from items
    const matchStatus = computeMatchStatus(parsed.data.items)

    const [grn] = await db
      .insert(goodsReceiptNotes)
      .values({
        companyId,
        purchaseOrderId: id,
        receivedByUserId: userId,
        grnRef,
        receivedDate: parsed.data.receivedDate,
        notes: parsed.data.notes,
        matchStatus,
        status: "draft",
      })
      .returning({ id: goodsReceiptNotes.id })

    if (!grn) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    // Insert items
    if (parsed.data.items.length > 0) {
      await db.insert(grnItems).values(
        parsed.data.items.map((item, idx) => ({
          grnId: grn.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          description: item.description,
          orderedQty: String(item.orderedQty),
          receivedQty: String(item.receivedQty),
          unit: item.unit ?? "buc",
          condition: item.condition,
          notes: item.notes,
          sortOrder: idx,
        }))
      )
    }

    // If fully matched, update PO to received
    if (matchStatus === "matched") {
      await db
        .update(purchaseOrders)
        .set({ status: "received", updatedAt: new Date() })
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)))
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "procurement.grn.create",
      entityType: "goods_receipt_note",
      entityId: grn.id,
      payload: { poId: id, grnRef, matchStatus, itemCount: parsed.data.items.length },
      method: "POST",
      path: "/api/procurement/" + id + "/grn",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: grn.id, grnRef, matchStatus }, { status: 201 })
  }
)
