import { describe, it, expect } from "vitest"
import {
  priceVariancePct,
  evaluateThreeWayMatch,
  DEFAULT_PRICE_TOLERANCE,
  type ThreeWayMatchInput,
} from "@/lib/three-way-match"

const base: ThreeWayMatchInput = {
  expectedValue: 1000,
  invoiceAmount: 1000,
  quantityFullyReceived: true,
  hasRejectedOrDamaged: false,
  tolerance: DEFAULT_PRICE_TOLERANCE,
}

describe("priceVariancePct", () => {
  it("is zero for an exact match", () => {
    expect(priceVariancePct(1000, 1000)).toBe(0)
  })

  it("is the absolute relative difference either way", () => {
    expect(priceVariancePct(1000, 1020)).toBeCloseTo(0.02, 10)
    expect(priceVariancePct(1000, 980)).toBeCloseTo(0.02, 10)
  })

  it("treats a zero expectation as matched only for a zero invoice", () => {
    expect(priceVariancePct(0, 0)).toBe(0)
    expect(priceVariancePct(0, 50)).toBe(1)
  })
})

describe("evaluateThreeWayMatch", () => {
  it("matches when quantity is complete and price is within tolerance", () => {
    const r = evaluateThreeWayMatch({ ...base, invoiceAmount: 1015 })
    expect(r.status).toBe("matched")
    expect(r.withinTolerance).toBe(true)
    expect(r.priceVariance).toBe(15)
  })

  it("flags a price variance when quantity is fine but the invoice exceeds tolerance", () => {
    const r = evaluateThreeWayMatch({ ...base, invoiceAmount: 1050 })
    expect(r.status).toBe("price_variance")
    expect(r.withinTolerance).toBe(false)
    expect(r.priceVariance).toBe(50)
    expect(r.priceVariancePct).toBeCloseTo(0.05, 10)
  })

  it("flags a quantity variance when price is fine but the receipt is short", () => {
    const r = evaluateThreeWayMatch({
      ...base,
      quantityFullyReceived: false,
      invoiceAmount: 1000,
    })
    expect(r.status).toBe("quantity_variance")
  })

  it("is a discrepancy when both quantity and price are off", () => {
    const r = evaluateThreeWayMatch({
      ...base,
      quantityFullyReceived: false,
      invoiceAmount: 1200,
    })
    expect(r.status).toBe("discrepancy")
  })

  it("is always a discrepancy when goods were rejected or damaged, even if the numbers line up", () => {
    const r = evaluateThreeWayMatch({ ...base, hasRejectedOrDamaged: true })
    expect(r.status).toBe("discrepancy")
  })

  it("treats the tolerance boundary as within tolerance", () => {
    const r = evaluateThreeWayMatch({ ...base, invoiceAmount: 1020, tolerance: 0.02 })
    expect(r.withinTolerance).toBe(true)
    expect(r.status).toBe("matched")
  })

  it("reports a negative variance when the supplier under-bills", () => {
    const r = evaluateThreeWayMatch({ ...base, invoiceAmount: 900 })
    expect(r.priceVariance).toBe(-100)
    expect(r.status).toBe("price_variance")
  })
})
