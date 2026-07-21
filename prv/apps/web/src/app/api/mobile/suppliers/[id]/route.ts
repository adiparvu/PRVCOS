import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { suppliers } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function supplierId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

// ─── PATCH /api/mobile/suppliers/[id] ────────────────────────────────────────

const patchSchema = z
  .object({
    status: z.enum(["active", "inactive", "pending", "blacklisted"]).optional(),
    contactName: z.string().max(255).optional(),
    email: z.string().email().max(254).optional(),
    phone: z.string().max(32).optional(),
    paymentTermsDays: z.number().int().min(0).max(365).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" })

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const id = supplierId(req)
  if (!id) return NextResponse.json({ error: "Missing supplier ID" }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const [existing] = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(
      and(eq(suppliers.id, id), eq(suppliers.companyId, ctx.companyId), isNull(suppliers.deletedAt))
    )
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Supplier not found" }, { status: 404 })

  const [updated] = await db
    .update(suppliers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, ctx.companyId)))
    .returning({ id: suppliers.id, status: suppliers.status })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "suppliers.update",
    entityType: "supplier",
    entityId: id,
    method: "PATCH",
    path: `/api/mobile/suppliers/${id}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { name: existing.name, changes: parsed.data },
  })

  return NextResponse.json(updated)
})

// ─── DELETE /api/mobile/suppliers/[id] — soft-delete (deactivate) ────────────

export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const id = supplierId(req)
  if (!id) return NextResponse.json({ error: "Missing supplier ID" }, { status: 400 })

  const [existing] = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(
      and(eq(suppliers.id, id), eq(suppliers.companyId, ctx.companyId), isNull(suppliers.deletedAt))
    )
    .limit(1)
  if (!existing) return NextResponse.json({ error: "Supplier not found" }, { status: 404 })

  await db
    .update(suppliers)
    .set({ deletedAt: new Date(), status: "inactive", updatedAt: new Date() })
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, ctx.companyId)))

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "suppliers.delete",
    entityType: "supplier",
    entityId: id,
    method: "DELETE",
    path: `/api/mobile/suppliers/${id}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { name: existing.name },
  })

  return new NextResponse(null, { status: 204 })
})
