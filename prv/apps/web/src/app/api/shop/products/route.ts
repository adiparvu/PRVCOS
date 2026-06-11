import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { products, productCategories } from "@prv/db/schema"
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm"
import { appendRealtimeEvent, realtimeChannel, REALTIME_EVENT } from "@prv/cache"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ProductCategory =
  | "tamplarie"
  | "sanitare"
  | "electrice"
  | "pardoseli"
  | "vopsele"
  | "scule"

export interface Product {
  id: string
  sku: string
  name: string
  category: ProductCategory
  price: number
  oldPrice?: number
  unit: string
  stock: number
  badge?: "sale" | "new" | "low-stock"
  featured: boolean
}

export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("q")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)
    const companyId = ctx.session.companyId

    const conditions = [
      eq(products.companyId, companyId),
      eq(products.isActive, true),
      eq(products.status, "active"),
      isNull(products.deletedAt),
    ]

    if (search) {
      conditions.push(sql`lower(${products.name}) LIKE ${`%${search.toLowerCase()}%`}`)
    }
    if (cursor) {
      conditions.push(lt(products.createdAt, new Date(cursor)))
    }

    const rawRows = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        price: products.price,
        unit: products.unit,
        stockQuantity: products.stockQuantity,
        stockMinimum: products.stockMinimum,
        categorySlug: productCategories.slug,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit + 1)

    const hasMore = rawRows.length > limit
    const page = hasMore ? rawRows.slice(0, limit) : rawRows
    const nextCursor =
      hasMore && page.length > 0 ? page[page.length - 1]!.createdAt.toISOString() : null

    let rows = page
    if (category) {
      rows = rows.filter((r) => r.categorySlug === category)
    }

    const mapped: Product[] = rows.map((r) => {
      let badge: Product["badge"] = undefined
      if (r.stockQuantity <= r.stockMinimum) badge = "low-stock"

      return {
        id: r.id,
        sku: r.sku ?? "",
        name: r.name,
        category: (r.categorySlug ?? "scule") as ProductCategory,
        price: Number(r.price),
        unit: r.unit,
        stock: r.stockQuantity,
        badge,
        featured: false,
      }
    })

    return NextResponse.json({ products: mapped, count: mapped.length, nextCursor })
  }
)

// ─── POST /api/shop/products ─────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  price: z.number().nonnegative(),
  unit: z.string().max(32).default("buc"),
  sku: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  stockMinimum: z.number().int().min(0).default(0),
  vatRate: z.number().nonnegative().default(19),
})

export const POST = withGates(
  { action: "shop.products.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = createProductSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const d = parsed.data

    const [inserted] = await db
      .insert(products)
      .values({
        companyId,
        name: d.name,
        description: d.description ?? null,
        price: String(d.price),
        unit: d.unit,
        sku: d.sku ?? null,
        categoryId: d.categoryId ?? null,
        stockQuantity: d.stockQuantity,
        stockMinimum: d.stockMinimum,
        vatRate: String(d.vatRate),
        status: "active",
        isActive: true,
      })
      .returning()

    if (!inserted) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.products.create",
      entityType: "product",
      entityId: inserted.id,
      payload: { name: d.name, price: d.price, sku: d.sku },
      method: "POST",
      path: "/api/shop/products",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    void appendRealtimeEvent(realtimeChannel.shop(companyId), REALTIME_EVENT.SHOP_UPDATE, {
      entityType: "product",
      entityId: inserted.id,
      action: "created",
      companyId,
    }).catch(() => null)

    const product: Product = {
      id: inserted.id,
      sku: inserted.sku ?? "",
      name: inserted.name,
      category: "scule" as ProductCategory,
      price: Number(inserted.price),
      unit: inserted.unit,
      stock: inserted.stockQuantity,
      badge: inserted.stockQuantity <= inserted.stockMinimum ? "low-stock" : undefined,
      featured: false,
    }

    return NextResponse.json({ product }, { status: 201 })
  }
)
