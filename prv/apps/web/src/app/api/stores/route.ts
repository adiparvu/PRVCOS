import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { stores } from "@prv/db/schema"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── GET /api/stores ───────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "stores.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const { searchParams } = req.nextUrl
    const q = searchParams.get("q")
    const region = searchParams.get("region")
    const isActive = searchParams.get("isActive")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)

    const conditions = [eq(stores.companyId, companyId)]

    if (q) {
      conditions.push(
        or(ilike(stores.name, `%${q}%`), ilike(stores.code, `%${q}%`)) as ReturnType<typeof eq>
      )
    }
    if (region) conditions.push(eq(stores.region, region))
    if (isActive !== null) conditions.push(eq(stores.isActive, isActive !== "false"))
    if (cursor) conditions.push(sql`${stores.createdAt} < ${cursor}::timestamptz`)

    const rows = await db
      .select()
      .from(stores)
      .where(and(...conditions))
      .orderBy(desc(stores.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.createdAt : null

    return NextResponse.json({ stores: data, nextCursor })
  }
)

// ── POST /api/stores ──────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  region: z.string().max(100).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
})

export const POST = withGates(
  { action: "stores.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    // Unique code within company
    const [existing] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.companyId, companyId), eq(stores.code, parsed.data.code)))
      .limit(1)

    if (existing)
      return NextResponse.json(
        { error: `Store code "${parsed.data.code}" is already in use` },
        { status: 409 }
      )

    const [store] = await db
      .insert(stores)
      .values({ companyId, ...parsed.data })
      .returning({ id: stores.id, name: stores.name, code: stores.code })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "stores.create",
      entityType: "store",
      entityId: store!.id,
      payload: parsed.data,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(store, { status: 201 })
  }
)
