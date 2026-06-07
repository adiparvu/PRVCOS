import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface CashFlowEntry {
  date: string
  inflow: number
  outflow: number
  balance: number
  forecast: boolean
}

export interface CashFlowCategory {
  label: string
  amount: number
  type: "in" | "out"
}

export interface CashFlowMeta {
  currentBalance: number
  totalIn: number
  totalOut: number
  net: number
  runwayDays: number
  avgMonthlyBurn: number
  forecastBalance30d: number
  forecastBalance60d: number
  forecastBalance90d: number
}

function generateEntries(): CashFlowEntry[] {
  const today = new Date("2026-06-07")
  const entries: CashFlowEntry[] = []

  let balance = 84200

  // 90 days of history
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dayOfMonth = d.getDate()

    let inflow = 0
    let outflow = 0

    // Payroll goes out on the 1st
    if (dayOfMonth === 1) outflow += 42000
    // Large client payment mid-month
    if (dayOfMonth === 15) inflow += 38000
    // Supplier payments at end of month
    if (dayOfMonth === 28) outflow += 12000
    // Random daily smaller flows
    inflow += Math.round((Math.random() * 4000 + 1000) * 10) / 10
    outflow += Math.round((Math.random() * 3000 + 800) * 10) / 10

    balance = balance + inflow - outflow
    entries.push({
      date: d.toISOString().slice(0, 10),
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      balance: Math.round(balance),
      forecast: false,
    })
  }

  // 30 days of forecast
  let forecastBalance = balance
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dayOfMonth = d.getDate()

    let inflow = 0
    let outflow = 0
    if (dayOfMonth === 1) outflow += 42000
    if (dayOfMonth === 15) inflow += 38000
    if (dayOfMonth === 28) outflow += 12000
    inflow += 2800
    outflow += 1900

    forecastBalance = forecastBalance + inflow - outflow
    entries.push({
      date: d.toISOString().slice(0, 10),
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      balance: Math.round(forecastBalance),
      forecast: true,
    })
  }

  return entries
}

const ALL_ENTRIES = generateEntries()

const CATEGORIES: CashFlowCategory[] = [
  { label: "Client Payments", amount: 148400, type: "in" },
  { label: "Project Advances", amount: 62000, type: "in" },
  { label: "Material Sales", amount: 18200, type: "in" },
  { label: "Payroll", amount: 126000, type: "out" },
  { label: "Suppliers", amount: 54800, type: "out" },
  { label: "Operations", amount: 22400, type: "out" },
  { label: "Tax & Duties", amount: 14600, type: "out" },
]

export const GET = withGates(
  { action: "finance.cash_flow.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const period = parseInt(req.nextUrl.searchParams.get("period") ?? "30", 10)
    const clampedPeriod = [30, 60, 90].includes(period) ? period : 30

    const today = "2026-06-07"
    const periodStart = new Date(today)
    periodStart.setDate(periodStart.getDate() - clampedPeriod)
    const startStr = periodStart.toISOString().slice(0, 10)

    const periodEntries = ALL_ENTRIES.filter((e) => e.date >= startStr && !e.forecast)
    const forecastEntries = ALL_ENTRIES.filter((e) => e.forecast)

    const totalIn = periodEntries.reduce((s, e) => s + e.inflow, 0)
    const totalOut = periodEntries.reduce((s, e) => s + e.outflow, 0)
    const currentBalance = periodEntries[periodEntries.length - 1]?.balance ?? 84200
    const avgDailyBurn = totalOut / clampedPeriod
    const runwayDays = Math.round(currentBalance / avgDailyBurn)

    const meta: CashFlowMeta = {
      currentBalance,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      runwayDays,
      avgMonthlyBurn: Math.round(avgDailyBurn * 30),
      forecastBalance30d: forecastEntries[29]?.balance ?? currentBalance,
      forecastBalance60d: forecastEntries[29]?.balance ?? currentBalance,
      forecastBalance90d: forecastEntries[29]?.balance ?? currentBalance,
    }

    return NextResponse.json({
      entries: [...periodEntries, ...forecastEntries.slice(0, 30)],
      periodEntries,
      forecastEntries: forecastEntries.slice(0, 30),
      categories: CATEGORIES,
      meta,
    })
  }
)
