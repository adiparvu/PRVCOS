import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { purchaseOrders, goodsReceiptNotes, grnItems, suppliers } from "@prv/db/schema"
import { and, count, eq, gte, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Grade = "A+" | "A" | "B" | "C" | "D"

function computeGrade(onTimeRate: number, rejectionRate: number): Grade {
  if (onTimeRate > 95 && rejectionRate < 2) return "A+"
  if (onTimeRate > 90 && rejectionRate < 5) return "A"
  if (onTimeRate > 80) return "B"
  if (onTimeRate > 70) return "C"
  return "D"
}

function extractSupplierId(req: NextRequest): string {
  // path: /api/suppliers/[id]/scorecard
  const parts = req.nextUrl.pathname.split("/")
  const scorecardIdx = parts.indexOf("scorecard")
  return scorecardIdx > 0 ? (parts[scorecardIdx - 1] ?? "") : ""
}

// ── GET /api/suppliers/[id]/scorecard ─────────────────────────────────────────

export const GET = withGates(
  { action: "suppliers.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const supplierId = extractSupplierId(req)
    if (!supplierId) return NextResponse.json({ error: "Missing supplier id" }, { status: 400 })

    const { companyId } = ctx.session

    // Verify supplier exists
    const [supplier] = await db
      .select({ id: suppliers.id, name: suppliers.name, currency: suppliers.currency })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.companyId, companyId),
          isNull(suppliers.deletedAt)
        )
      )
      .limit(1)

    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 })

    // 12-month window
    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)

    // Fetch all POs for this supplier in last 12 months
    const poRows = await db
      .select({
        id: purchaseOrders.id,
        status: purchaseOrders.status,
        amount: purchaseOrders.amount,
        date: purchaseOrders.date,
        neededBy: purchaseOrders.neededBy,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.companyId, companyId),
          eq(purchaseOrders.supplierId, supplierId),
          isNull(purchaseOrders.deletedAt),
          gte(purchaseOrders.createdAt, since)
        )
      )

    const totalOrders = poRows.length
    const receivedPOs = poRows.filter((p) => p.status === "received" || p.status === "in_transit")
    const totalSpend = receivedPOs.reduce((s, p) => s + Number(p.amount), 0)

    const poIds = poRows.map((p) => p.id)

    let onTimeRate = 0
    let avgLeadTimeDays: number | null = null
    let qualityRejectionRate = 0

    if (poIds.length > 0) {
      const poIdsSql = sql.join(
        poIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )

      // Fetch GRNs for on-time and lead-time calculations
      const grnRows = await db
        .select({
          purchaseOrderId: goodsReceiptNotes.purchaseOrderId,
          receivedDate: goodsReceiptNotes.receivedDate,
        })
        .from(goodsReceiptNotes)
        .where(
          and(
            eq(goodsReceiptNotes.companyId, companyId),
            sql`${goodsReceiptNotes.purchaseOrderId} = ANY(ARRAY[${poIdsSql}])`
          )
        )

      // Map PO -> earliest GRN received date
      const grnByPO = new Map<string, string>()
      for (const g of grnRows) {
        const existing = grnByPO.get(g.purchaseOrderId)
        if (!existing || g.receivedDate < existing) {
          grnByPO.set(g.purchaseOrderId, g.receivedDate)
        }
      }

      // On-time rate: received POs where receivedDate <= neededBy
      const receivedWithNeededBy = receivedPOs.filter((p) => p.neededBy && grnByPO.has(p.id))
      if (receivedWithNeededBy.length > 0) {
        const onTime = receivedWithNeededBy.filter((p) => grnByPO.get(p.id)! <= p.neededBy!)
        onTimeRate = (onTime.length / receivedWithNeededBy.length) * 100
      } else if (receivedPOs.length > 0) {
        onTimeRate = 100
      }

      // Avg lead time: days between PO date and GRN receivedDate
      const leadTimes: number[] = []
      for (const po2 of poRows) {
        const receivedDate = grnByPO.get(po2.id)
        if (receivedDate && po2.date) {
          const ordered = new Date(po2.date).getTime()
          const received = new Date(receivedDate).getTime()
          const days = Math.round((received - ordered) / (1000 * 60 * 60 * 24))
          if (days >= 0) leadTimes.push(days)
        }
      }
      avgLeadTimeDays =
        leadTimes.length > 0
          ? Math.round(leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length)
          : null

      // Quality rejection rate
      const [itemAgg] = await db
        .select({
          total: count(),
          rejected: sql<number>`count(*) filter (where ${grnItems.condition} = 'rejected')`,
        })
        .from(grnItems)
        .innerJoin(goodsReceiptNotes, eq(grnItems.grnId, goodsReceiptNotes.id))
        .where(
          and(
            eq(goodsReceiptNotes.companyId, companyId),
            sql`${goodsReceiptNotes.purchaseOrderId} = ANY(ARRAY[${poIdsSql}])`
          )
        )

      if (itemAgg && Number(itemAgg.total) > 0) {
        qualityRejectionRate = (Number(itemAgg.rejected) / Number(itemAgg.total)) * 100
      }
    }

    const grade = computeGrade(onTimeRate, qualityRejectionRate)

    return NextResponse.json({
      supplierId: supplier.id,
      supplierName: supplier.name,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      totalSpend,
      totalOrders,
      avgLeadTimeDays,
      qualityRejectionRate: Math.round(qualityRejectionRate * 10) / 10,
      grade,
      currency: supplier.currency,
    })
  }
)
