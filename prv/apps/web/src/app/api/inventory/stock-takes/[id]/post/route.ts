import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { stockTakeSessions, stockTakeLines, stockLevels, stockMovements } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { applyMovement } from "@/lib/inventory"
import { linesToPost } from "@/lib/stock-take"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function sessionId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  return parts[parts.indexOf("stock-takes") + 1] ?? ""
}

// POST .../post — the explicit reconciliation. For every discrepant, unposted line
// this posts a "count" stock movement that sets the level to the counted absolute
// (delta computed against the LIVE level, so concurrent movements are reflected in
// the ledger). Nothing is ever auto-adjusted; each movement is audited.
export const POST = withGates(
  { action: "shop.products.stock_adjust", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = sessionId(req)

    const [s] = await db
      .select()
      .from(stockTakeSessions)
      .where(and(eq(stockTakeSessions.id, id), eq(stockTakeSessions.companyId, companyId)))
      .limit(1)
    if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (s.status !== "counting")
      return NextResponse.json({ error: "Session already posted or closed" }, { status: 409 })

    const lines = await db
      .select({
        id: stockTakeLines.id,
        productId: stockTakeLines.productId,
        systemQty: stockTakeLines.systemQty,
        countedQty: stockTakeLines.countedQty,
        posted: stockTakeLines.posted,
      })
      .from(stockTakeLines)
      .where(eq(stockTakeLines.sessionId, id))

    const toPost = linesToPost(lines)
    const now = new Date()
    let posted = 0

    for (const line of toPost) {
      // Recompute the delta against the LIVE level so a movement between counting
      // and posting is reflected in the ledger; the resulting balance is the count.
      const [level] = await db
        .select({ quantity: stockLevels.quantity })
        .from(stockLevels)
        .where(and(eq(stockLevels.productId, line.productId), eq(stockLevels.storeId, s.storeId)))
        .limit(1)
      const current = level?.quantity ?? 0
      const { delta, balanceAfter } = applyMovement("count", line.countedQty, current)

      await db
        .insert(stockLevels)
        .values({
          companyId,
          productId: line.productId,
          storeId: s.storeId,
          quantity: balanceAfter,
        })
        .onConflictDoUpdate({
          target: [stockLevels.productId, stockLevels.storeId],
          set: { quantity: balanceAfter, updatedAt: now },
        })

      await db.insert(stockMovements).values({
        companyId,
        productId: line.productId,
        storeId: s.storeId,
        type: "count",
        delta,
        balanceAfter,
        reason: `Inventariere: ${s.name}`,
        createdById: userId,
      })

      await db
        .update(stockTakeLines)
        .set({ posted: true, updatedAt: now })
        .where(eq(stockTakeLines.id, line.id))
      posted++
    }

    await db
      .update(stockTakeSessions)
      .set({ status: "posted", postedById: userId, postedAt: now, updatedAt: now })
      .where(and(eq(stockTakeSessions.id, id), eq(stockTakeSessions.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "inventory.stock_take.post",
      entityType: "stock_take_session",
      entityId: id,
      payload: { name: s.name, storeId: s.storeId, adjustments: posted, totalLines: lines.length },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ posted, totalLines: lines.length })
  }
)
