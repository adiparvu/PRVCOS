import { describe, it, expect } from "vitest"
import { computePayslip } from "@/lib/payslip"

describe("computePayslip", () => {
  it("sums gross and subtracts deductions for net", () => {
    const r = computePayslip({
      baseAmount: 3000,
      overtimeAmount: 500,
      bonusAmount: 200,
      allowanceAmount: 100,
      deductionAmount: 800,
    })
    expect(r.gross).toBe(3800) // 3000+500+200+100
    expect(r.net).toBe(3000) // 3800-800
  })

  it("handles a zero payslip", () => {
    const r = computePayslip({
      baseAmount: 0,
      overtimeAmount: 0,
      bonusAmount: 0,
      allowanceAmount: 0,
      deductionAmount: 0,
    })
    expect(r).toEqual({ gross: 0, net: 0 })
  })

  it("rounds to two decimals", () => {
    const r = computePayslip({
      baseAmount: 1000.005,
      overtimeAmount: 0,
      bonusAmount: 0,
      allowanceAmount: 0,
      deductionAmount: 0.004,
    })
    expect(r.gross).toBe(1000.01)
  })
})
