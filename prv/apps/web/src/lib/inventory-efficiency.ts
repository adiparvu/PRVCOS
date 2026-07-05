// Inventory efficiency — cross-module BI (roadmap 15.6). Pure + unit-tested.
//
// Combines procurement cost (Finance — product cost price) with sell-through
// (Shop — stock "sale" movements) into a per-product annualized stock turnover,
// days-on-hand, and a health band, plus a portfolio roll-up. Slow and dead stock
// is capital tied up on the shelf; fast turnover is efficient use of that capital.

export interface InventoryEfficiencyInput {
  productId: string
  name: string
  unitsSold: number // units moved out via "sale" over the window
  currentStock: number // on-hand units across all locations
  costPrice: number // unit procurement cost
}

export type TurnoverBand = "fast" | "healthy" | "slow" | "dead"

export interface InventoryEfficiency {
  productId: string
  name: string
  unitsSold: number
  currentStock: number
  costPrice: number
  inventoryValue: number // currentStock × costPrice — capital on the shelf
  cogs: number // unitsSold × costPrice — cost of what sold
  turnover: number | null // annualized turns per year; null when nothing on hand
  daysOnHand: number | null // 365 / turnover; null when turnover is 0/undefined
  band: TurnoverBand
}

export interface InventoryEfficiencySummary {
  products: InventoryEfficiency[]
  totalInventoryValue: number
  totalCogs: number
  overallTurnover: number | null
  deadStockValue: number
  deadCount: number
  slowCount: number
}

// Annualized-turnover band thresholds (turns per year).
const SLOW_MAX = 2 // < 2 turns/yr → slow
const HEALTHY_MAX = 6 // < 6 turns/yr → healthy, otherwise fast

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function safe(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function bandFor(currentStock: number, unitsSold: number, turnover: number | null): TurnoverBand {
  // Capital sitting still with no sell-through is dead stock, the worst signal.
  if (currentStock > 0 && unitsSold === 0) return "dead"
  if (turnover === null) return unitsSold > 0 ? "fast" : "healthy"
  if (turnover < SLOW_MAX) return "slow"
  if (turnover < HEALTHY_MAX) return "healthy"
  return "fast"
}

const BAND_RANK: Record<TurnoverBand, number> = { dead: 0, slow: 1, healthy: 2, fast: 3 }

/**
 * Build per-product efficiency + a portfolio roll-up over a window of
 * `periodDays`. Products are ranked worst-first (dead, then slow) by tied-up
 * inventory value, so the biggest capital problems surface at the top.
 */
export function computeInventoryEfficiency(
  inputs: InventoryEfficiencyInput[],
  periodDays: number
): InventoryEfficiencySummary {
  const days = Math.max(1, Math.floor(safe(periodDays)))
  const annualize = 365 / days

  const products: InventoryEfficiency[] = inputs.map((p) => {
    const unitsSold = Math.floor(safe(p.unitsSold))
    const currentStock = Math.floor(safe(p.currentStock))
    const costPrice = round2(safe(p.costPrice))
    const inventoryValue = round2(currentStock * costPrice)
    const cogs = round2(unitsSold * costPrice)
    // Turnover = (units sold / units on hand) annualized. Null when nothing is
    // on hand, since turnover of an empty shelf is undefined.
    const turnover = currentStock > 0 ? round2((unitsSold / currentStock) * annualize) : null
    const daysOnHand = turnover && turnover > 0 ? round1(365 / turnover) : null
    return {
      productId: p.productId,
      name: p.name,
      unitsSold,
      currentStock,
      costPrice,
      inventoryValue,
      cogs,
      turnover,
      daysOnHand,
      band: bandFor(currentStock, unitsSold, turnover),
    }
  })

  products.sort((a, b) => {
    if (BAND_RANK[a.band] !== BAND_RANK[b.band]) return BAND_RANK[a.band] - BAND_RANK[b.band]
    return b.inventoryValue - a.inventoryValue
  })

  const totalInventoryValue = round2(products.reduce((s, p) => s + p.inventoryValue, 0))
  const totalCogs = round2(products.reduce((s, p) => s + p.cogs, 0))
  const overallTurnover =
    totalInventoryValue > 0 ? round2((totalCogs / totalInventoryValue) * annualize) : null

  return {
    products,
    totalInventoryValue,
    totalCogs,
    overallTurnover,
    deadStockValue: round2(
      products.filter((p) => p.band === "dead").reduce((s, p) => s + p.inventoryValue, 0)
    ),
    deadCount: products.filter((p) => p.band === "dead").length,
    slowCount: products.filter((p) => p.band === "slow").length,
  }
}
