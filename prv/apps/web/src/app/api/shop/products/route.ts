import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { products, productCategories } from "@prv/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"

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

    let rows = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        price: products.price,
        unit: products.unit,
        stockQuantity: products.stockQuantity,
        stockMinimum: products.stockMinimum,
        categorySlug: productCategories.slug,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(...conditions))

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

    return NextResponse.json({ products: mapped, count: mapped.length })
  }
)
