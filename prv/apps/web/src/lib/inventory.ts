// Inventory math (roadmap 9.2). Pure + unit-tested.

export type StockStatus = "out" | "reorder" | "low" | "ok"

/**
 * Health of a stock level. "out" at zero, "reorder" at/below the reorder point,
 * "low" at/below the minimum, else "ok". reorderPoint (when set) is treated as
 * the earliest warning and typically sits above the minimum.
 */
export function stockStatus(
  quantity: number,
  minimum: number,
  reorderPoint: number | null
): StockStatus {
  if (quantity <= 0) return "out"
  if (reorderPoint != null && quantity <= reorderPoint) return "reorder"
  if (quantity <= minimum) return "low"
  return "ok"
}

export type MovementType = "receive" | "sale" | "adjust" | "writeoff" | "return" | "count"

/**
 * The signed delta a movement applies to the current quantity. receive/return
 * add; sale/writeoff subtract; adjust/count set the level to the given absolute
 * value (delta = target − current). The resulting balance never goes negative.
 */
export function movementDelta(type: MovementType, quantity: number, currentQty: number): number {
  switch (type) {
    case "receive":
    case "return":
      return Math.abs(quantity)
    case "sale":
    case "writeoff":
      return -Math.min(Math.abs(quantity), currentQty) // don't drive below zero
    case "adjust":
    case "count":
      return Math.max(0, quantity) - currentQty // set absolute
  }
}

export function applyMovement(
  type: MovementType,
  quantity: number,
  currentQty: number
): { delta: number; balanceAfter: number } {
  const delta = movementDelta(type, quantity, currentQty)
  return { delta, balanceAfter: Math.max(0, currentQty + delta) }
}
