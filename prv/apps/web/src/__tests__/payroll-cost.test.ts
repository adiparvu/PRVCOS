import { describe, it, expect } from "vitest"
import { computePayrollCost } from "@/lib/payroll-cost"

const NOW = Date.parse("2026-07-15T00:00:00.000Z")

function run(
  type: string,
  status: string,
  totalGross: number,
  netPaid: number,
  employeeCount: number,
  periodEnd: string
) {
  return {
    type: type as never,
    status: status as never,
    totalGross,
    netPaid,
    employeeCount,
    periodEnd,
  }
}

describe("computePayrollCost", () => {
  it("returns zeros for no runs", () => {
    const p = computePayrollCost([], NOW, 6)
    expect(p.runs).toBe(0)
    expect(p.totalGross).toBe(0)
    expect(p.avgCostPerEmployee).toBe(0)
    expect(p.months).toHaveLength(6)
  })

  it("totals gross, net and deductions and averages per employee", () => {
    const p = computePayrollCost(
      [
        run("monthly", "done", 10000, 8000, 10, "2026-07-31"),
        run("weekly", "done", 2000, 1600, 8, "2026-07-07"),
      ],
      NOW,
      6
    )
    expect(p.totalGross).toBe(12000)
    expect(p.totalNet).toBe(9600)
    expect(p.deductions).toBe(2400)
    expect(p.employeeSlots).toBe(18)
    expect(p.avgCostPerEmployee).toBe(round(12000 / 18))
  })

  it("breaks gross down by run type, largest first", () => {
    const p = computePayrollCost(
      [
        run("monthly", "done", 10000, 8000, 10, "2026-07-31"),
        run("weekly", "done", 2000, 1600, 8, "2026-07-07"),
        run("weekly", "done", 2500, 2000, 8, "2026-07-14"),
      ],
      NOW,
      6
    )
    expect(p.byType[0]).toEqual({ type: "monthly", gross: 10000, runs: 1 })
    expect(p.byType[1]).toEqual({ type: "weekly", gross: 4500, runs: 2 })
  })

  it("counts the status mix and buckets gross by period-end month", () => {
    const p = computePayrollCost(
      [
        run("monthly", "done", 9000, 7000, 10, "2026-07-31"),
        run("monthly", "pending", 9000, 0, 10, "2026-06-30"),
      ],
      NOW,
      6
    )
    expect(p.byStatus.done).toBe(1)
    expect(p.byStatus.pending).toBe(1)
    expect(p.months[5]!.gross).toBe(9000) // July
    expect(p.months[4]!.gross).toBe(9000) // June
  })

  it("computes month-over-month gross change", () => {
    const p = computePayrollCost(
      [
        run("monthly", "done", 8000, 6000, 10, "2026-06-30"),
        run("monthly", "done", 10000, 8000, 10, "2026-07-31"),
      ],
      NOW,
      6
    )
    expect(p.momChangePct).toBe(25)
  })
})

function round(n: number): number {
  return Math.round(n * 100) / 100
}
