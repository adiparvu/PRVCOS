// Phase 9.2 — Stock-take / cycle-count (pure logic).
//
// A stock-take snapshots the system quantity per product at count time, records
// the physically counted quantity, and derives the variance. Posting reconciles
// each discrepancy via a "count" stock movement (the level is set to the counted
// absolute). Variance = counted − system: positive means surplus found on the
// floor, negative means a shortage.

export function variance(systemQty: number, countedQty: number): number {
  return countedQty - systemQty
}

export interface StockTakeLineLite {
  systemQty: number
  countedQty: number
}

export interface StockTakeSummary {
  totalLines: number
  discrepancies: number
  overCount: number
  underCount: number
  netVariance: number
  absVariance: number
}

// Roll counted lines into headline figures for the session.
export function summarizeStockTake(lines: StockTakeLineLite[]): StockTakeSummary {
  let discrepancies = 0
  let overCount = 0
  let underCount = 0
  let netVariance = 0
  let absVariance = 0
  for (const l of lines) {
    const v = variance(l.systemQty, l.countedQty)
    if (v !== 0) discrepancies++
    if (v > 0) overCount++
    else if (v < 0) underCount++
    netVariance += v
    absVariance += Math.abs(v)
  }
  return {
    totalLines: lines.length,
    discrepancies,
    overCount,
    underCount,
    netVariance,
    absVariance,
  }
}

// Only discrepant, not-yet-posted lines need a reconciling movement.
export function linesToPost<T extends StockTakeLineLite & { posted: boolean }>(lines: T[]): T[] {
  return lines.filter((l) => !l.posted && variance(l.systemQty, l.countedQty) !== 0)
}
