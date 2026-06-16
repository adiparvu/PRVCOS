import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { stores } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function storeId(req: NextRequest) {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

async function resolveStore(id: string, companyId: string) {
  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))
    .limit(1)
  return store ?? null
}

// ── GET /api/stores/[id] ──────────────────────────────────────────────────────

export const GET = withGates(
  { action: "stores.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const store = await resolveStore(storeId(req), companyId)
    if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ store })
  }
)

// ── PATCH /api/stores/[id] ────────────────────────────────────────────────────

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  region: z.string().max(100).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
})

export const PATCH = withGates(
  { action: "stores.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = storeId(req)
    const { companyId, userId, sessionId } = ctx.session

    const store = await resolveStore(id, companyId)
    if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    // Check code uniqueness if code is being changed
    if (parsed.data.code && parsed.data.code !== store.code) {
      const [conflict] = await db
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.companyId, companyId), eq(stores.code, parsed.data.code)))
        .limit(1)
      if (conflict)
        return NextResponse.json(
          { error: `Store code "${parsed.data.code}" is already in use` },
          { status: 409 }
        )
    }

    const [updated] = await db
      .update(stores)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))
      .returning({ id: stores.id, name: stores.name, code: stores.code, isActive: stores.isActive })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "stores.update",
      entityType: "store",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/stores/[id] ───────────────────────────────────────────────────
// Deactivates the store (sets isActive = false). Hard-delete is not permitted
// because stores are referenced by shifts, attendance records, and orders.

export const DELETE = withGates(
  { action: "stores.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = storeId(req)
    const { companyId, userId, sessionId } = ctx.session

    const store = await resolveStore(id, companyId)
    if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!store.isActive)
      return NextResponse.json({ error: "Store is already inactive" }, { status: 409 })

    await db
      .update(stores)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(stores.id, id), eq(stores.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "stores.deactivate",
      entityType: "store",
      entityId: id,
      payload: { name: store.name, code: store.code },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
