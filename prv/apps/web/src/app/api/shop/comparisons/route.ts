import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { productComparisons, products, productCategories } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_COMPARE = 4

export interface ComparisonProduct {
  id: string
  productId: string
  productName: string
  productSku: string
  price: number
  unit: string
  category: string | null
  description: string | null
  addedAt: string
}

export const GET = withGates(
  { action: "shop.comparisons.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session

    const rows = await db
      .select({
        id: productComparisons.id,
        productId: productComparisons.productId,
        addedAt: productComparisons.addedAt,
        productName: products.name,
        productSku: products.sku,
        price: products.price,
        unit: products.unit,
        description: products.description,
        categorySlug: productCategories.slug,
      })
      .from(productComparisons)
      .innerJoin(products, eq(productComparisons.productId, products.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(
        and(eq(productComparisons.userId, userId), eq(productComparisons.companyId, companyId))
      )

    const items: ComparisonProduct[] = rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      productSku: r.productSku ?? "",
      price: Number(r.price),
      unit: r.unit,
      description: r.description,
      category: r.categorySlug,
      addedAt: r.addedAt.toISOString(),
    }))

    return NextResponse.json({ items, count: items.length, max: MAX_COMPARE })
  }
)

export const POST = withGates(
  { action: "shop.comparisons.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { productId } = (await req.json()) as { productId?: string }

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 })
    }

    const { userId, companyId } = ctx.session

    // Enforce per-user limit
    const existing = await db
      .select({ id: productComparisons.id })
      .from(productComparisons)
      .where(
        and(eq(productComparisons.userId, userId), eq(productComparisons.companyId, companyId))
      )

    if (existing.length >= MAX_COMPARE) {
      return NextResponse.json(
        { error: `comparison_limit_reached`, max: MAX_COMPARE },
        { status: 422 }
      )
    }

    const [inserted] = await db
      .insert(productComparisons)
      .values({ userId, companyId, productId })
      .onConflictDoNothing()
      .returning()

    if (!inserted) {
      return NextResponse.json({ added: false, reason: "already_in_comparison" })
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.comparisons.create",
      entityType: "product_comparison",
      entityId: inserted.id,
      payload: { productId },
    })

    return NextResponse.json({ added: true, id: inserted.id }, { status: 201 })
  }
)

export const DELETE = withGates(
  { action: "shop.comparisons.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { productId } = (await req.json()) as { productId?: string }

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 })
    }

    const { userId, companyId } = ctx.session

    await db
      .delete(productComparisons)
      .where(
        and(
          eq(productComparisons.userId, userId),
          eq(productComparisons.productId, productId),
          eq(productComparisons.companyId, companyId)
        )
      )

    return NextResponse.json({ removed: true })
  }
)
