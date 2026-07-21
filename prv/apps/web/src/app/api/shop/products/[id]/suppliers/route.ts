import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { productSuppliers, products, suppliers } from "@prv/db/schema"
import { and, eq, ne, asc } from "drizzle-orm"
import { z } from "zod"
import { pickPreferredSupplier } from "@/lib/product-suppliers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ProductSupplierLink {
  id: string
  supplierId: string
  supplierName: string | null
  supplierSku: string | null
  cost: number | null
  leadTimeDays: number | null
  minOrderQty: number | null
  isPreferred: boolean
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
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, id), eq(products.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// GET /api/shop/products/[id]/suppliers — the product's sourcing links, the
// preferred supplier first.
export const GET = withGates(
  { action: "shop.products.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const product = await verifyProduct(id, ctx.session.companyId)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const rows = await db
      .select({
        id: productSuppliers.id,
        supplierId: productSuppliers.supplierId,
        supplierSku: productSuppliers.supplierSku,
        cost: productSuppliers.cost,
        leadTimeDays: productSuppliers.leadTimeDays,
        minOrderQty: productSuppliers.minOrderQty,
        isPreferred: productSuppliers.isPreferred,
        supplierName: suppliers.name,
      })
      .from(productSuppliers)
      .leftJoin(suppliers, eq(productSuppliers.supplierId, suppliers.id))
      .where(eq(productSuppliers.productId, id))
      .orderBy(asc(suppliers.name))

    const links: ProductSupplierLink[] = rows.map((r) => ({
      id: r.id,
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      supplierSku: r.supplierSku,
      cost: num(r.cost),
      leadTimeDays: r.leadTimeDays,
      minOrderQty: r.minOrderQty,
      isPreferred: r.isPreferred,
    }))
    links.sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))

    // The single best sourcing option: the preferred link, else the lowest-cost
    // one (a fallback the preferred-first sort above does not provide) — so a
    // reorder/PO draft can pick a default supplier without re-deriving it.
    const preferredSupplierId = pickPreferredSupplier(links)?.supplierId ?? null

    return NextResponse.json({ links, preferredSupplierId })
  }
)

// POST /api/shop/products/[id]/suppliers — link a supplier to the product.
const postSchema = z.object({
  supplierId: z.string().uuid(),
  supplierSku: z.string().max(100).nullable().optional(),
  cost: z.number().min(0).max(100_000_000).nullable().optional(),
  leadTimeDays: z.number().int().min(0).max(3650).nullable().optional(),
  minOrderQty: z.number().int().min(0).max(10_000_000).nullable().optional(),
  isPreferred: z.boolean().default(false),
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
      .insert(productSuppliers)
      .values({
        companyId,
        productId: id,
        supplierId: d.supplierId,
        supplierSku: d.supplierSku ?? null,
        cost: d.cost != null ? d.cost.toFixed(2) : null,
        leadTimeDays: d.leadTimeDays ?? null,
        minOrderQty: d.minOrderQty ?? null,
        isPreferred: d.isPreferred,
      })
      .onConflictDoUpdate({
        target: [productSuppliers.productId, productSuppliers.supplierId],
        set: {
          supplierSku: d.supplierSku ?? null,
          cost: d.cost != null ? d.cost.toFixed(2) : null,
          leadTimeDays: d.leadTimeDays ?? null,
          minOrderQty: d.minOrderQty ?? null,
          isPreferred: d.isPreferred,
          updatedAt: new Date(),
        },
      })
      .returning({ id: productSuppliers.id })

    // Preferred is exclusive per product.
    if (d.isPreferred && record) {
      await db
        .update(productSuppliers)
        .set({ isPreferred: false })
        .where(and(eq(productSuppliers.productId, id), ne(productSuppliers.id, record.id)))
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.products.supplier.link",
      entityType: "product_supplier",
      entityId: record?.id ?? id,
      payload: { productId: id, supplierId: d.supplierId, isPreferred: d.isPreferred },
      method: "POST",
      path: `/api/shop/products/${id}/suppliers`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
