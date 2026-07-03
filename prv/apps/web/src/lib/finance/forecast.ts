// Financial forecasting (roadmap 11.5). Pure + unit-tested.
//
// Projects a forward P&L from three inputs: a recurring monthly revenue run
// rate, the weighted sales pipeline (spread over the months it is expected to
// land), and a monthly expense run rate. Produces per-month revenue / expense /
// net / cumulative figures, a break-even month, and optimistic / base /
// conservative scenarios.

export type Scenario = "conservative" | "base" | "optimistic"

export const SCENARIOS: Scenario[] = ["conservative", "base", "optimistic"]

/** Revenue multipliers applied per scenario (expenses stay fixed). */
export const SCENARIO_REVENUE_FACTOR: Record<Scenario, number> = {
  conservative: 0.85,
  base: 1,
  optimistic: 1.15,
}

export interface ForecastInputs {
  monthlyRevenueRunRate: number // recurring/known revenue per month
  weightedPipelineTotal: number // expected new revenue from the open pipeline
  pipelineSpreadMonths: number // months over which the pipeline is expected to land
  monthlyExpenseRunRate: number // recurring expenses per month
  openingCumulative: number // starting cumulative net (e.g. current cash/profit)
}

export interface ForecastMonth {
  index: number // 1-based month offset from now
  revenue: number
  expenses: number
  net: number
  cumulativeNet: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Project the monthly P&L for `horizonMonths` under a given scenario. */
export function projectPL(
  inp: ForecastInputs,
  horizonMonths: number,
  scenario: Scenario = "base"
): ForecastMonth[] {
  const factor = SCENARIO_REVENUE_FACTOR[scenario]
  const base = Math.max(0, inp.monthlyRevenueRunRate)
  const expenses = round2(Math.max(0, inp.monthlyExpenseRunRate))
  const spread = Math.max(1, Math.floor(inp.pipelineSpreadMonths))
  const pipelinePerMonth = Math.max(0, inp.weightedPipelineTotal) / spread

  const months: ForecastMonth[] = []
  let cumulative = inp.openingCumulative
  for (let i = 1; i <= horizonMonths; i++) {
    const pipelineThisMonth = i <= spread ? pipelinePerMonth : 0
    const revenue = round2((base + pipelineThisMonth) * factor)
    const net = round2(revenue - expenses)
    cumulative = round2(cumulative + net)
    months.push({ index: i, revenue, expenses, net, cumulativeNet: cumulative })
  }
  return months
}

/**
 * First month index (1-based) whose cumulative net is non-negative — the
 * break-even point. Returns null if it never breaks even within the horizon.
 * With constant run rates cumulative net is monotonic, so this is the single
 * crossing into (or the start already in) the black.
 */
export function breakEvenMonth(months: ForecastMonth[]): number | null {
  for (const m of months) {
    if (m.cumulativeNet >= 0) return m.index
  }
  return null
}

export interface ScenarioSummary {
  scenario: Scenario
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  endingCumulative: number
  breakEvenMonth: number | null
}

/** Summarize all three scenarios over the horizon. */
export function summarizeScenarios(inp: ForecastInputs, horizonMonths: number): ScenarioSummary[] {
  return SCENARIOS.map((scenario) => {
    const months = projectPL(inp, horizonMonths, scenario)
    const totalRevenue = round2(months.reduce((s, m) => s + m.revenue, 0))
    const totalExpenses = round2(months.reduce((s, m) => s + m.expenses, 0))
    return {
      scenario,
      totalRevenue,
      totalExpenses,
      netProfit: round2(totalRevenue - totalExpenses),
      endingCumulative: months.length
        ? months[months.length - 1]!.cumulativeNet
        : inp.openingCumulative,
      breakEvenMonth: breakEvenMonth(months),
    }
  })
}
