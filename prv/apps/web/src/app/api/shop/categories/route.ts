import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { productCategories, products } from "@prv/db/schema"
import { and, asc, eq, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ProductCategoryRow {
  id: string
  slug: string
  name: string
  description: string | null
  parentId: string | null
  sortOrder: number
  productCount: number
}

export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    // Fetch categories with live product counts in a single join
    const rows = await db
      .select({
        id: productCategories.id,
        slug: productCategories.slug,
        name: productCategories.name,
        description: productCategories.description,
        parentId: productCategories.parentId,
        sortOrder: productCategories.sortOrder,
        productCount: sql<number>`cast(count(${products.id}) as int)`,
      })
      .from(productCategories)
      .leftJoin(
        products,
        and(
          eq(products.categoryId, productCategories.id),
          eq(products.companyId, companyId),
          eq(products.isActive, true)
        )
      )
      .where(and(eq(productCategories.companyId, companyId), eq(productCategories.isActive, true)))
      .groupBy(
        productCategories.id,
        productCategories.slug,
        productCategories.name,
        productCategories.description,
        productCategories.parentId,
        productCategories.sortOrder
      )
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))

    const categories: ProductCategoryRow[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      parentId: r.parentId,
      sortOrder: r.sortOrder,
      productCount: r.productCount ?? 0,
    }))

    // Build parent→children tree for hierarchical display
    const rootCategories = categories.filter((c) => !c.parentId)
    const childMap: Record<string, ProductCategoryRow[]> = {}
    for (const c of categories) {
      if (c.parentId) {
        if (!childMap[c.parentId]) childMap[c.parentId] = []
        childMap[c.parentId]!.push(c)
      }
    }

    return NextResponse.json({
      categories,
      tree: rootCategories.map((root) => ({
        ...root,
        children: childMap[root.id] ?? [],
      })),
      totalCount: categories.length,
    })
  }
)
