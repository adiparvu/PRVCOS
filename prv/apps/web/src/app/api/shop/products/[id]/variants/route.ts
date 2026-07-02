import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { productVariants, products } from "@prv/db/schema"
import { and, eq, asc } from "drizzle-orm"
import { z } from "zod"
import { variantAxes, priceRange } from "@/lib/variants"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ProductVariant {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  options: Record<string, string>
  price: number | null
  stockQuantity: number
  isActive: boolean
}

function pid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}
function num(v: string | null): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function verifyProduct(id: string, companyId: string) {
  const [row] = await db
    .select({ id: products.id, price: products.price })
    .from(products)
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// GET /api/shop/products/[id]/variants — a product's variants with its option
// axes and price range.
export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const product = await verifyProduct(id, ctx.session.companyId)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const rows = await db
      .select({
        id: productVariants.id,
        name: productVariants.name,
        sku: productVariants.sku,
        barcode: productVariants.barcode,
        options: productVariants.options,
        price: productVariants.price,
        stockQuantity: productVariants.stockQuantity,
        isActive: productVariants.isActive,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.name))

    const variants: ProductVariant[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      barcode: r.barcode,
      options: r.options ?? {},
      price: num(r.price),
      stockQuantity: r.stockQuantity,
      isActive: r.isActive,
    }))

    const basePrice = num(product.price) ?? 0
    return NextResponse.json({
      variants,
      axes: variantAxes(variants),
      priceRange: priceRange(variants, basePrice),
    })
  }
)

// POST /api/shop/products/[id]/variants — add a variant.
const postSchema = z.object({
  name: z.string().min(1).max(160),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  options: z.record(z.string()).default({}),
  price: z.number().min(0).max(100_000_000).nullable().optional(),
  stockQuantity: z.number().int().min(0).max(10_000_000).default(0),
})

export const POST = withGates(
  { action: "shop.products.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const product = await verifyProduct(id, companyId)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

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

    const [record] = await db
      .insert(productVariants)
      .values({
        companyId,
        productId: id,
        name: d.name,
        sku: d.sku ?? null,
        barcode: d.barcode ?? null,
        options: d.options,
        price: d.price != null ? d.price.toFixed(2) : null,
        stockQuantity: d.stockQuantity,
      })
      .returning({ id: productVariants.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.products.variant.create",
      entityType: "product_variant",
      entityId: record?.id ?? id,
      payload: { productId: id, name: d.name },
      method: "POST",
      path: `/api/shop/products/${id}/variants`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
