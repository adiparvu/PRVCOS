import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { promotions } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

const patchSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    status: z.enum(["draft", "active", "paused", "expired"]).optional(),
    value: z.number().min(0).max(1_000_000).optional(),
    minSubtotal: z.number().min(0).max(100_000_000).optional(),
    endsAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    usageLimit: z.number().int().min(1).max(10_000_000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "shop.promotions.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

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
    if (d.status !== undefined) patch.status = d.status
    if (d.value !== undefined) patch.value = d.value.toFixed(2)
    if (d.minSubtotal !== undefined) patch.minSubtotal = d.minSubtotal.toFixed(2)
    if (d.endsAt !== undefined) patch.endsAt = d.endsAt
    if (d.usageLimit !== undefined) patch.usageLimit = d.usageLimit

    const [updated] = await db
      .update(promotions)
      .set(patch)
      .where(and(eq(promotions.id, rowId), eq(promotions.companyId, companyId)))
      .returning({ id: promotions.id, status: promotions.status })

    if (!updated) return NextResponse.json({ error: "Promotion not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.promotions.update",
      entityType: "promotion",
      entityId: rowId,
      payload: { ...d },
      method: "PATCH",
      path: `/api/shop/promotions/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, status: updated.status })
  }
)

export const DELETE = withGates(
  { action: "shop.promotions.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(promotions)
      .where(and(eq(promotions.id, rowId), eq(promotions.companyId, companyId)))
      .returning({ id: promotions.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.promotions.delete",
      entityType: "promotion",
      entityId: rowId,
      payload: { id: rowId },
      method: "DELETE",
      path: `/api/shop/promotions/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
