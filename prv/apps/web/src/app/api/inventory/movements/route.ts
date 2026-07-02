import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { stockLevels, stockMovements, products, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { z } from "zod"
import { applyMovement, type MovementType } from "@/lib/inventory"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TYPES = ["receive", "sale", "adjust", "writeoff", "return", "count"] as const

export interface StockMovementRow {
  id: string
  productId: string
  productName: string | null
  storeId: string
  type: (typeof TYPES)[number]
  delta: number
  balanceAfter: number
  reason: string | null
  byName: string | null
  createdAt: string
}

// GET /api/inventory/movements?productId=&storeId= — the movement log, newest
// first.
export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const sp = req.nextUrl.searchParams
    const productId = sp.get("productId")
    const storeId = sp.get("storeId")

    const conds = [eq(stockMovements.companyId, ctx.session.companyId)]
    if (productId) conds.push(eq(stockMovements.productId, productId))
    if (storeId) conds.push(eq(stockMovements.storeId, storeId))

    const rows = await db
      .select({
        id: stockMovements.id,
        productId: stockMovements.productId,
        storeId: stockMovements.storeId,
        type: stockMovements.type,
        delta: stockMovements.delta,
        balanceAfter: stockMovements.balanceAfter,
        reason: stockMovements.reason,
        createdAt: stockMovements.createdAt,
        productName: products.name,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(users, eq(stockMovements.createdById, users.id))
      .where(and(...conds))
      .orderBy(desc(stockMovements.createdAt))
      .limit(100)

    const movements: StockMovementRow[] = rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      storeId: r.storeId,
      type: r.type as (typeof TYPES)[number],
      delta: r.delta,
      balanceAfter: r.balanceAfter,
      reason: r.reason,
      byName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ movements })
  }
)

// POST /api/inventory/movements — record a movement. Upserts the (product,
// store) stock level to the new balance and appends a movement row.
const postSchema = z.object({
  productId: z.string().uuid(),
  storeId: z.string().uuid(),
  type: z.enum(TYPES),
  quantity: z.number().int().min(0).max(1_000_000),
  minimum: z.number().int().min(0).max(1_000_000).optional(),
  reorderPoint: z.number().int().min(0).max(1_000_000).nullable().optional(),
  reason: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "shop.products.stock_adjust", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, d.productId), eq(products.companyId, companyId)))
      .limit(1)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const [level] = await db
      .select({ quantity: stockLevels.quantity })
      .from(stockLevels)
      .where(and(eq(stockLevels.productId, d.productId), eq(stockLevels.storeId, d.storeId)))
      .limit(1)

    const current = level?.quantity ?? 0
    const { delta, balanceAfter } = applyMovement(d.type as MovementType, d.quantity, current)

    await db
      .insert(stockLevels)
      .values({
        companyId,
        productId: d.productId,
        storeId: d.storeId,
        quantity: balanceAfter,
        minimum: d.minimum ?? 0,
        reorderPoint: d.reorderPoint ?? null,
      })
      .onConflictDoUpdate({
        target: [stockLevels.productId, stockLevels.storeId],
        set: {
          quantity: balanceAfter,
          ...(d.minimum !== undefined ? { minimum: d.minimum } : {}),
          ...(d.reorderPoint !== undefined ? { reorderPoint: d.reorderPoint } : {}),
          updatedAt: new Date(),
        },
      })

    const [record] = await db
      .insert(stockMovements)
      .values({
        companyId,
        productId: d.productId,
        storeId: d.storeId,
        type: d.type,
        delta,
        balanceAfter,
        reason: d.reason ?? null,
        createdById: actorId,
      })
      .returning({ id: stockMovements.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "inventory.movement.create",
      entityType: "stock_movement",
      entityId: record?.id ?? d.productId,
      payload: { productId: d.productId, storeId: d.storeId, type: d.type, delta, balanceAfter },
      method: "POST",
      path: "/api/inventory/movements",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id, delta, balanceAfter }, { status: 201 })
  }
)
