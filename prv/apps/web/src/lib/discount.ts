// Promotion discount math (roadmap 9.5). Pure + unit-tested.

export type PromotionType = "percentage" | "fixed_amount" | "free_shipping"

export interface DiscountInput {
  type: PromotionType
  value: number
  subtotal: number
  minSubtotal: number
}

/**
 * The monetary discount a promotion applies to a subtotal. Returns 0 when the
 * subtotal is below the minimum spend. Percentage is capped at the subtotal;
 * fixed amount can't exceed it; free_shipping applies no line discount here
 * (shipping is handled separately).
 */
export function computeDiscount(input: DiscountInput): number {
  if (input.subtotal < input.minSubtotal) return 0
  let d = 0
  if (input.type === "percentage")
    d = (input.subtotal * Math.max(0, Math.min(100, input.value))) / 100
  else if (input.type === "fixed_amount") d = Math.min(Math.max(0, input.value), input.subtotal)
  else d = 0 // free_shipping
  return Math.round(d * 100) / 100
}

export interface PromotionState {
  status: string
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
  usageCount: number
}

/** Whether a promotion is redeemable today (active, in-window, under its cap). */
export function isPromotionRedeemable(p: PromotionState, today: string): boolean {
  if (p.status !== "active") return false
  if (p.startsAt && today < p.startsAt) return false
  if (p.endsAt && today > p.endsAt) return false
  if (p.usageLimit != null && p.usageCount >= p.usageLimit) return false
  return true
}
