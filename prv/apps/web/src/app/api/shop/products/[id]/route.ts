import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { products, productCategories } from "@prv/db/schema"
import { and, eq, isNull, ne } from "drizzle-orm"
import { z } from "zod"
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

// ─── PATCH /api/shop/products/[id] ───────────────────────────────────────────

const productPatchSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    price: z.number().nonnegative().optional(),
    unit: z.string().max(32).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    stockMinimum: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.price !== undefined ||
      d.unit !== undefined ||
      d.stockQuantity !== undefined ||
      d.stockMinimum !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withGates(
  { action: "shop.products.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = productPatchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(
        and(eq(products.id, id), eq(products.companyId, companyId), isNull(products.deletedAt))
      )
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const [updated] = await db
      .update(products)
      .set({
        ...(d.name !== undefined && { name: d.name }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.price !== undefined && { price: String(d.price) }),
        ...(d.unit !== undefined && { unit: d.unit }),
        ...(d.stockQuantity !== undefined && { stockQuantity: d.stockQuantity }),
        ...(d.stockMinimum !== undefined && { stockMinimum: d.stockMinimum }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))
      .returning({ id: products.id, name: products.name, isActive: products.isActive })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.products.update",
      entityType: "product",
      entityId: id,
      payload: { name: existing.name, changes: d },
      method: "PATCH",
      path: `/api/shop/products/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/shop/products/[id] ──────────────────────────────────────────

export const DELETE = withGates(
  { action: "shop.products.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? ""
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(
        and(eq(products.id, id), eq(products.companyId, companyId), isNull(products.deletedAt))
      )
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(products)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.products.delete",
      entityType: "product",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/shop/products/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
