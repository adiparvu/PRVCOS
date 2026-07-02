import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { promotions } from "@prv/db/schema"
import { eq, desc } from "drizzle-orm"
import { z } from "zod"
import { isPromotionRedeemable } from "@/lib/discount"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TYPES = ["percentage", "fixed_amount", "free_shipping"] as const
const SCOPES = ["order", "product", "category"] as const
const STATUSES = ["draft", "active", "paused", "expired"] as const

export interface PromotionSummary {
  id: string
  name: string
  type: (typeof TYPES)[number]
  scope: (typeof SCOPES)[number]
  value: number
  minSubtotal: number
  code: string | null
  status: (typeof STATUSES)[number]
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
  usageCount: number
  autoApply: boolean
  redeemable: boolean
}

export interface PromotionMeta {
  total: number
  active: number
  redeemable: number
}

function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// GET /api/shop/promotions — the promotions register, each flagged redeemable.
export const GET = withGates(
  { action: "shop.promotions.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select()
      .from(promotions)
      .where(eq(promotions.companyId, ctx.session.companyId))
      .orderBy(desc(promotions.createdAt))

    const today = new Date().toISOString().slice(0, 10)
    const list: PromotionSummary[] = rows.map((r) => {
      const state = {
        status: r.status,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        usageLimit: r.usageLimit,
        usageCount: r.usageCount,
      }
      return {
        id: r.id,
        name: r.name,
        type: r.type as (typeof TYPES)[number],
        scope: r.scope as (typeof SCOPES)[number],
        value: num(r.value),
        minSubtotal: num(r.minSubtotal),
        code: r.code,
        status: r.status as (typeof STATUSES)[number],
        startsAt: r.startsAt,
        endsAt: r.endsAt,
        usageLimit: r.usageLimit,
        usageCount: r.usageCount,
        autoApply: r.autoApply,
        redeemable: isPromotionRedeemable(state, today),
      }
    })

    const meta: PromotionMeta = {
      total: list.length,
      active: list.filter((p) => p.status === "active").length,
      redeemable: list.filter((p) => p.redeemable).length,
    }

    return NextResponse.json({ promotions: list, meta })
  }
)

// POST /api/shop/promotions — create a promotion (with optional coupon code).
const ISO = /^\d{4}-\d{2}-\d{2}$/
const postSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  type: z.enum(TYPES).default("percentage"),
  scope: z.enum(SCOPES).default("order"),
  value: z.number().min(0).max(1_000_000),
  minSubtotal: z.number().min(0).max(100_000_000).default(0),
  code: z.string().min(2).max(40).nullable().optional(),
  status: z.enum(["draft", "active"]).default("draft"),
  startsAt: z.string().regex(ISO).nullable().optional(),
  endsAt: z.string().regex(ISO).nullable().optional(),
  usageLimit: z.number().int().min(1).max(10_000_000).nullable().optional(),
  autoApply: z.boolean().default(false),
})

export const POST = withGates(
  { action: "shop.promotions.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

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
    if (d.type === "percentage" && d.value > 100) {
      return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 422 })
    }

    const [record] = await db
      .insert(promotions)
      .values({
        companyId,
        name: d.name,
        description: d.description ?? null,
        type: d.type,
        scope: d.scope,
        value: d.value.toFixed(2),
        minSubtotal: d.minSubtotal.toFixed(2),
        code: d.code ? d.code.toUpperCase() : null,
        status: d.status,
        startsAt: d.startsAt ?? null,
        endsAt: d.endsAt ?? null,
        usageLimit: d.usageLimit ?? null,
        autoApply: d.autoApply,
        createdById: actorId,
      })
      .returning({ id: promotions.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "shop.promotions.create",
      entityType: "promotion",
      entityId: record?.id ?? d.name,
      payload: { name: d.name, type: d.type, code: d.code ?? null },
      method: "POST",
      path: "/api/shop/promotions",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
