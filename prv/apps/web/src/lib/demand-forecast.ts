// Inventory demand forecast — forward-looking reorder planning (roadmap 15.5).
// Pure + unit-tested.
//
// Projects each product's future demand from its trailing sale velocity, then
// derives days-of-cover, a stockout prediction over the planning horizon, and a
// suggested reorder quantity that restores cover to the horizon plus the
// reorder buffer. Turns "what sold" into "what to buy, and when".

export interface DemandForecastInput {
  productId: string
  name: string
  unitsSold: number // units sold over the trailing window
  currentStock: number // on-hand across all locations
  reorderPoint: number | null // level that should trigger a reorder
  minimum: number // safety-stock floor (fallback reorder trigger)
  costPrice: number // unit procurement cost
}

export type DemandBand = "critical" | "reorder" | "healthy" | "overstock"

// Days of forward cover below which a product is flagged.
const CRITICAL_DAYS = 7 // stock out within a week → critical
const OVERSTOCK_DAYS = 180 // more than ~6 months of cover → overstock

export interface DemandForecast {
  productId: string
  name: string
  currentStock: number
  dailyVelocity: number // units/day over the window
  daysOfCover: number | null // currentStock / velocity; null when velocity is 0
  projectedDemand: number // expected units consumed over the horizon
  reorderPoint: number // effective trigger (reorderPoint ?? minimum)
  suggestedReorderQty: number // units to order now (0 when not needed)
  suggestedReorderValue: number // suggestedReorderQty × costPrice
  band: DemandBand
}

export interface DemandForecastSummary {
  horizonDays: number
  windowDays: number
  products: DemandForecast[]
  criticalCount: number
  reorderCount: number
  totalSuggestedUnits: number
  totalSuggestedValue: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function safe(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

const BAND_RANK: Record<DemandBand, number> = {
  critical: 0,
  reorder: 1,
  overstock: 2,
  healthy: 3,
}

function bandFor(
  daysOfCover: number | null,
  currentStock: number,
  reorderPoint: number,
  horizonDays: number
): DemandBand {
  // No sales but stock on hand → capital that will not turn over: overstock.
  if (daysOfCover === null) return currentStock > 0 ? "overstock" : "healthy"
  if (currentStock <= reorderPoint || daysOfCover < CRITICAL_DAYS) return "critical"
  if (daysOfCover < horizonDays) return "reorder"
  if (daysOfCover > OVERSTOCK_DAYS) return "overstock"
  return "healthy"
}

/**
 * Build a per-product demand forecast + reorder plan over `horizonDays`, using
 * a trailing sale window of `windowDays` to estimate velocity. Products are
 * ranked most-urgent first (critical, then reorder).
 */
export function computeDemandForecast(
  inputs: DemandForecastInput[],
  windowDays: number,
  horizonDays: number
): DemandForecastSummary {
  const window = Math.max(1, Math.floor(safe(windowDays)))
  const horizon = Math.max(1, Math.floor(safe(horizonDays)))

  const products: DemandForecast[] = inputs.map((p) => {
    const unitsSold = Math.floor(safe(p.unitsSold))
    const currentStock = Math.floor(safe(p.currentStock))
    const costPrice = round2(safe(p.costPrice))
    const reorderPoint = Math.floor(
      p.reorderPoint !== null && Number.isFinite(p.reorderPoint)
        ? Math.max(0, p.reorderPoint)
        : safe(p.minimum)
    )
    const dailyVelocity = round2(unitsSold / window)
    const daysOfCover = dailyVelocity > 0 ? round1(currentStock / dailyVelocity) : null
    const projectedDemand = Math.ceil(dailyVelocity * horizon)
    const band = bandFor(daysOfCover, currentStock, reorderPoint, horizon)

    // Order enough to cover the horizon plus restore the reorder buffer.
    let suggestedReorderQty = 0
    if (band === "critical" || band === "reorder") {
      suggestedReorderQty = Math.max(0, projectedDemand + reorderPoint - currentStock)
    }

    return {
      productId: p.productId,
      name: p.name,
      currentStock,
      dailyVelocity,
      daysOfCover,
      projectedDemand,
      reorderPoint,
      suggestedReorderQty,
      suggestedReorderValue: round2(suggestedReorderQty * costPrice),
      band,
    }
  })

  products.sort((a, b) => {
    if (BAND_RANK[a.band] !== BAND_RANK[b.band]) return BAND_RANK[a.band] - BAND_RANK[b.band]
    // within a band, soonest-to-run-out first
    const ac = a.daysOfCover ?? Number.POSITIVE_INFINITY
    const bc = b.daysOfCover ?? Number.POSITIVE_INFINITY
    return ac - bc
  })

  return {
    horizonDays: horizon,
    windowDays: window,
    products,
    criticalCount: products.filter((p) => p.band === "critical").length,
    reorderCount: products.filter((p) => p.band === "reorder").length,
    totalSuggestedUnits: products.reduce((s, p) => s + p.suggestedReorderQty, 0),
    totalSuggestedValue: round2(products.reduce((s, p) => s + p.suggestedReorderValue, 0)),
  }
}
