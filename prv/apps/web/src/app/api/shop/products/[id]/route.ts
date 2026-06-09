import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { products, productCategories } from "@prv/db/schema"
import { and, eq, isNull, ne } from "drizzle-orm"
import type { Product, ProductCategory } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ProductSpec {
  label: string
  value: string
}

export interface ProductDetail extends Product {
  description: string
  specs: ProductSpec[]
  tags: string[]
  minOrderQty: number
}

export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const rows = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        price: products.price,
        unit: products.unit,
        stockQuantity: products.stockQuantity,
        stockMinimum: products.stockMinimum,
        tags: products.tags,
        categoryId: products.categoryId,
        categorySlug: productCategories.slug,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(
        and(
          eq(products.id, id),
          eq(products.companyId, companyId),
          eq(products.isActive, true),
          isNull(products.deletedAt)
        )
      )
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let badge: Product["badge"] = undefined
    if (row.stockQuantity <= row.stockMinimum) badge = "low-stock"

    const relatedRows = row.categoryId
      ? await db
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
          .where(
            and(
              eq(products.companyId, companyId),
              eq(products.categoryId, row.categoryId!),
              eq(products.isActive, true),
              isNull(products.deletedAt),
              ne(products.id, id)
            )
          )
          .limit(4)
      : []

    const related: Product[] = relatedRows.map((r) => ({
      id: r.id,
      sku: r.sku ?? "",
      name: r.name,
      category: (r.categorySlug ?? "scule") as ProductCategory,
      price: Number(r.price),
      unit: r.unit,
      stock: r.stockQuantity,
      badge: r.stockQuantity <= r.stockMinimum ? ("low-stock" as const) : undefined,
      featured: false,
    }))

    const product: ProductDetail = {
      id: row.id,
      sku: row.sku ?? "",
      name: row.name,
      category: (row.categorySlug ?? "scule") as ProductCategory,
      price: Number(row.price),
      unit: row.unit,
      stock: row.stockQuantity,
      badge,
      featured: false,
      description: row.description ?? "",
      specs: [],
      tags: (row.tags as string[]) ?? [],
      minOrderQty: 1,
    }

    return NextResponse.json({ product, related })
  }
)
