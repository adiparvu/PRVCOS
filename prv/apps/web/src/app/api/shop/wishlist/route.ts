import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { productWishlistItems, products, productCategories } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface WishlistItem {
  id: string
  productId: string
  productName: string
  productSku: string
  price: number
  unit: string
  category: string | null
  notes: string | null
  addedAt: string
}

export const GET = withGates(
  { action: "shop.wishlist.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId } = ctx.session

    const rows = await db
      .select({
        id: productWishlistItems.id,
        productId: productWishlistItems.productId,
        notes: productWishlistItems.notes,
        addedAt: productWishlistItems.addedAt,
        productName: products.name,
        productSku: products.sku,
        price: products.price,
        unit: products.unit,
        categorySlug: productCategories.slug,
      })
      .from(productWishlistItems)
      .innerJoin(products, eq(productWishlistItems.productId, products.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(
        and(eq(productWishlistItems.userId, userId), eq(productWishlistItems.companyId, companyId))
      )
      .orderBy(desc(productWishlistItems.addedAt))
      .limit(500) // reasonable cap for a personal wishlist

    const items: WishlistItem[] = rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      productSku: r.productSku ?? "",
      price: Number(r.price),
      unit: r.unit,
      category: r.categorySlug,
      notes: r.notes,
      addedAt: r.addedAt.toISOString(),
    }))

    return NextResponse.json({ items, count: items.length })
  }
)

export const POST = withGates(
  { action: "shop.wishlist.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { productId, notes } = (await req.json()) as {
      productId?: string
      notes?: string
    }

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 })
    }

    const { userId, companyId } = ctx.session

    const [inserted] = await db
      .insert(productWishlistItems)
      .values({ userId, companyId, productId, notes: notes ?? null })
      .onConflictDoNothing()
      .returning()

    if (!inserted) {
      return NextResponse.json({ added: false, reason: "already_in_wishlist" })
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.wishlist.create",
      entityType: "product_wishlist_item",
      entityId: inserted.id,
      payload: { productId },
    })

    return NextResponse.json({ added: true, id: inserted.id }, { status: 201 })
  }
)

export const DELETE = withGates(
  { action: "shop.wishlist.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { productId } = (await req.json()) as { productId?: string }

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 })
    }

    const { userId, companyId } = ctx.session

    await db
      .delete(productWishlistItems)
      .where(
        and(
          eq(productWishlistItems.userId, userId),
          eq(productWishlistItems.productId, productId),
          eq(productWishlistItems.companyId, companyId)
        )
      )

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.wishlist.delete",
      entityType: "product_wishlist_item",
      entityId: productId,
      payload: { productId },
    })

    return NextResponse.json({ removed: true })
  }
)
