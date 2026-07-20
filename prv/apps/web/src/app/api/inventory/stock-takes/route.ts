import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { stockTakeSessions, stockTakeLines, stores } from "@prv/db/schema"
import { and, count, desc, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface StockTakeSummaryRow {
  id: string
  name: string
  storeId: string
  storeName: string | null
  status: "draft" | "counting" | "posted" | "cancelled"
  lineCount: number
  postedAt: string | null
  createdAt: string
}

// GET /api/inventory/stock-takes — the company's count sessions, newest first.
export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: stockTakeSessions.id,
        name: stockTakeSessions.name,
        storeId: stockTakeSessions.storeId,
        status: stockTakeSessions.status,
        postedAt: stockTakeSessions.postedAt,
        createdAt: stockTakeSessions.createdAt,
        storeName: stores.name,
        lineCount: count(stockTakeLines.id),
      })
      .from(stockTakeSessions)
      .leftJoin(stores, eq(stockTakeSessions.storeId, stores.id))
      .leftJoin(stockTakeLines, eq(stockTakeLines.sessionId, stockTakeSessions.id))
      .where(eq(stockTakeSessions.companyId, ctx.session.companyId))
      .groupBy(stockTakeSessions.id, stores.name)
      .orderBy(desc(stockTakeSessions.createdAt))
      .limit(100)

    const sessions: StockTakeSummaryRow[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      storeId: r.storeId,
      storeName: r.storeName ?? null,
      status: r.status,
      lineCount: Number(r.lineCount),
      postedAt: r.postedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
    return NextResponse.json({ sessions })
  }
)

const createSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
})

// POST /api/inventory/stock-takes — open a new counting session for a store.
export const POST = withGates(
  { action: "shop.products.stock_adjust", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 })

    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.id, parsed.data.storeId), eq(stores.companyId, companyId)))
      .limit(1)
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    const [created] = await db
      .insert(stockTakeSessions)
      .values({
        companyId,
        storeId: parsed.data.storeId,
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
        createdById: userId,
      })
      .returning({ id: stockTakeSessions.id })

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "inventory.stock_take.create",
      entityType: "stock_take_session",
      entityId: created.id,
      payload: { name: parsed.data.name, storeId: parsed.data.storeId },
      method: "POST",
      path: "/api/inventory/stock-takes",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  }
)
