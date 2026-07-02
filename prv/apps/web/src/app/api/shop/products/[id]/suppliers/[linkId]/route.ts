import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { productSuppliers } from "@prv/db/schema"
import { and, eq, ne } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest): { productId: string; linkId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { productId: parts.at(-3) ?? "", linkId: parts.at(-1) ?? "" }
}

const patchSchema = z
  .object({
    supplierSku: z.string().max(100).nullable().optional(),
    cost: z.number().min(0).max(100_000_000).nullable().optional(),
    leadTimeDays: z.number().int().min(0).max(3650).nullable().optional(),
    minOrderQty: z.number().int().min(0).max(10_000_000).nullable().optional(),
    isPreferred: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "shop.products.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { productId, linkId } = ids(req)
    if (!productId || !linkId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

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
    if (d.supplierSku !== undefined) patch.supplierSku = d.supplierSku
    if (d.cost !== undefined) patch.cost = d.cost != null ? d.cost.toFixed(2) : null
    if (d.leadTimeDays !== undefined) patch.leadTimeDays = d.leadTimeDays
    if (d.minOrderQty !== undefined) patch.minOrderQty = d.minOrderQty
    if (d.isPreferred !== undefined) patch.isPreferred = d.isPreferred

    const [updated] = await db
      .update(productSuppliers)
      .set(patch)
      .where(and(eq(productSuppliers.id, linkId), eq(productSuppliers.companyId, companyId)))
      .returning({ id: productSuppliers.id })

    if (!updated) return NextResponse.json({ error: "Link not found" }, { status: 404 })

    if (d.isPreferred === true) {
      await db
        .update(productSuppliers)
        .set({ isPreferred: false })
        .where(and(eq(productSuppliers.productId, productId), ne(productSuppliers.id, linkId)))
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.products.supplier.update",
      entityType: "product_supplier",
      entityId: linkId,
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
    const { linkId } = ids(req)
    if (!linkId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(productSuppliers)
      .where(and(eq(productSuppliers.id, linkId), eq(productSuppliers.companyId, companyId)))
      .returning({ id: productSuppliers.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.products.supplier.unlink",
      entityType: "product_supplier",
      entityId: linkId,
      payload: { id: linkId },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
