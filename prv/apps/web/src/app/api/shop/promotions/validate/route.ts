import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { promotions } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computeDiscount, isPromotionRedeemable, type PromotionType } from "@/lib/discount"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().min(0).max(100_000_000),
})

function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// POST /api/shop/promotions/validate — check a coupon code against a subtotal
// and return the discount (or a reason it doesn't apply).
export const POST = withGates(
  { action: "shop.promotions.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const { code, subtotal } = parsed.data

    const [promo] = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.companyId, ctx.session.companyId),
          eq(promotions.code, code.toUpperCase())
        )
      )
      .limit(1)

    if (!promo) {
      return NextResponse.json({ valid: false, reason: "Unknown coupon code" })
    }

    const today = new Date().toISOString().slice(0, 10)
    const state = {
      status: promo.status,
      startsAt: promo.startsAt,
      endsAt: promo.endsAt,
      usageLimit: promo.usageLimit,
      usageCount: promo.usageCount,
    }
    if (!isPromotionRedeemable(state, today)) {
      return NextResponse.json({ valid: false, reason: "Coupon is not currently active" })
    }
    const minSubtotal = num(promo.minSubtotal)
    if (subtotal < minSubtotal) {
      return NextResponse.json({
        valid: false,
        reason: `Minimum spend of ${minSubtotal} not met`,
      })
    }

    const discount = computeDiscount({
      type: promo.type as PromotionType,
      value: num(promo.value),
      subtotal,
      minSubtotal,
    })

    return NextResponse.json({
      valid: true,
      discount,
      promotion: { id: promo.id, name: promo.name, type: promo.type, value: num(promo.value) },
    })
  }
)
