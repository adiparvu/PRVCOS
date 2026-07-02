import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { productVariants } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest): { productId: string; variantId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { productId: parts.at(-3) ?? "", variantId: parts.at(-1) ?? "" }
}

const patchSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    sku: z.string().max(100).nullable().optional(),
    barcode: z.string().max(100).nullable().optional(),
    options: z.record(z.string()).optional(),
    price: z.number().min(0).max(100_000_000).nullable().optional(),
    stockQuantity: z.number().int().min(0).max(10_000_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "shop.products.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { variantId } = ids(req)
    if (!variantId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (d.name !== undefined) patch.name = d.name
    if (d.sku !== undefined) patch.sku = d.sku
    if (d.barcode !== undefined) patch.barcode = d.barcode
    if (d.options !== undefined) patch.options = d.options
    if (d.price !== undefined) patch.price = d.price != null ? d.price.toFixed(2) : null
    if (d.stockQuantity !== undefined) patch.stockQuantity = d.stockQuantity
    if (d.isActive !== undefined) patch.isActive = d.isActive

    const [updated] = await db
      .update(productVariants)
      .set(patch)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.companyId, companyId)))
      .returning({ id: productVariants.id })

    if (!updated) return NextResponse.json({ error: "Variant not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.products.variant.update",
      entityType: "product_variant",
      entityId: variantId,
      payload: { ...d },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id })
  }
)

export const DELETE = withGates(
  { action: "shop.products.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { variantId } = ids(req)
    if (!variantId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(productVariants)
      .where(and(eq(productVariants.id, variantId), eq(productVariants.companyId, companyId)))
      .returning({ id: productVariants.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.products.variant.delete",
      entityType: "product_variant",
      entityId: variantId,
      payload: { id: variantId },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
