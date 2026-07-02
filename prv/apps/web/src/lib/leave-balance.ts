// Leave balance math (roadmap 7.3). Pure + unit-tested so the API and UI agree.

export interface LeaveBalanceInput {
  entitlementDays: number
  carriedOverDays: number
  usedDays: number
  pendingDays: number
  accrualDaysPerMonth?: number | null
  /** Months elapsed in the year (0–12) for accrual-based entitlement. */
  monthsElapsed?: number
}

export interface LeaveBalanceResult {
  /** entitlement + carried-over (the total pot for the year). */
  entitlementTotal: number
  /** Remaining after used + pending are subtracted. Can go negative (overdrawn). */
  available: number
  /** Accrued-to-date when a monthly accrual rate is set, else null. */
  accruedToDate: number | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeLeaveBalance(input: LeaveBalanceInput): LeaveBalanceResult {
  const entitlementTotal = input.entitlementDays + input.carriedOverDays
  const available = entitlementTotal - input.usedDays - input.pendingDays

  let accruedToDate: number | null = null
  if (input.accrualDaysPerMonth != null && input.accrualDaysPerMonth > 0) {
    const months = Math.max(0, Math.min(12, input.monthsElapsed ?? 0))
    // Accrual can't exceed the annual entitlement.
    accruedToDate = Math.min(input.entitlementDays, input.accrualDaysPerMonth * months)
  }

  return {
    entitlementTotal: round2(entitlementTotal),
    available: round2(available),
    accruedToDate: accruedToDate === null ? null : round2(accruedToDate),
  }
}
