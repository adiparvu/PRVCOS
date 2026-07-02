// Payslip math (roadmap 8.2). Pure + unit-tested so the API and payslip UI agree.

export interface PayslipInput {
  baseAmount: number
  overtimeAmount: number
  bonusAmount: number
  allowanceAmount: number
  deductionAmount: number
}

export interface PayslipResult {
  gross: number
  net: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Gross = base + overtime + bonus + allowance. Net = gross − deduction.
export function computePayslip(input: PayslipInput): PayslipResult {
  const gross = input.baseAmount + input.overtimeAmount + input.bonusAmount + input.allowanceAmount
  const net = gross - input.deductionAmount
  return { gross: round2(gross), net: round2(net) }
}
