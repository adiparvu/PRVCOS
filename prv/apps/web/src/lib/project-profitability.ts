// Project profitability — cross-module BI (roadmap 15.6). Pure + unit-tested.
//
// Combines project revenue (paid invoices, from Finance) with project cost
// (spent budget, from Projects) into per-project profit + margin, plus a
// portfolio roll-up. Read-only analysis; no writes.

export interface ProjectPnLInput {
  id: string
  name: string
  revenue: number // paid invoices attributed to the project
  cost: number // actual spend (spent budget)
  budget: number // approved budget, for utilization
}

export type ProfitBand = "profitable" | "thin" | "loss"

export interface ProjectPnL {
  id: string
  name: string
  revenue: number
  cost: number
  profit: number
  marginPct: number // profit / revenue * 100, 0 when no revenue
  budgetUsedPct: number // cost / budget * 100
  band: ProfitBand
}

export interface Portfolio {
  projects: ProjectPnL[]
  totalRevenue: number
  totalCost: number
  totalProfit: number
  marginPct: number
  profitableCount: number
  lossCount: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function safe(n: number): number {
  return Number.isFinite(n) ? n : 0
}

function bandFor(profit: number, marginPct: number): ProfitBand {
  if (profit < 0) return "loss"
  if (marginPct < 10) return "thin"
  return "profitable"
}

/** Build per-project P&L and the portfolio roll-up, ranked by profit desc. */
export function computeProfitability(inputs: ProjectPnLInput[]): Portfolio {
  const projects: ProjectPnL[] = inputs.map((p) => {
    const revenue = round2(Math.max(0, safe(p.revenue)))
    const cost = round2(Math.max(0, safe(p.cost)))
    const budget = Math.max(0, safe(p.budget))
    const profit = round2(revenue - cost)
    const marginPct = revenue > 0 ? round1((profit / revenue) * 100) : 0
    const budgetUsedPct = budget > 0 ? round1((cost / budget) * 100) : 0
    return {
      id: p.id,
      name: p.name,
      revenue,
      cost,
      profit,
      marginPct,
      budgetUsedPct,
      band: bandFor(profit, marginPct),
    }
  })

  projects.sort((a, b) => b.profit - a.profit || b.revenue - a.revenue)

  const totalRevenue = round2(projects.reduce((s, p) => s + p.revenue, 0))
  const totalCost = round2(projects.reduce((s, p) => s + p.cost, 0))
  const totalProfit = round2(totalRevenue - totalCost)
  return {
    projects,
    totalRevenue,
    totalCost,
    totalProfit,
    marginPct: totalRevenue > 0 ? round1((totalProfit / totalRevenue) * 100) : 0,
    profitableCount: projects.filter((p) => p.band === "profitable").length,
    lossCount: projects.filter((p) => p.band === "loss").length,
  }
}
