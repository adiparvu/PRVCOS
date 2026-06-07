import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type PayrollRunStatus = "processing" | "done" | "pending"
export type PayrollRunType = "weekly" | "monthly" | "special"

export interface PayrollRun {
  id: string
  title: string
  subtitle: string
  period: string
  employeeCount: number
  totalGross: number
  netPaid: number
  status: PayrollRunStatus
  type: PayrollRunType
  ref: string
}

export interface PayrollMeta {
  currentRunAmount: number
  totalEmployees: number
  pendingCount: number
  ytdCost: number
  monthLabel: string
  growthPct: number
}

const MOCK_RUNS: PayrollRun[] = [
  {
    id: "pr1",
    title: "Săptămâna 2 Iun",
    subtitle: "142 angajați · 9–15 Iun 2026",
    period: "9–15 Iun 2026",
    employeeCount: 142,
    totalGross: 28400,
    netPaid: 19880,
    status: "processing",
    type: "weekly",
    ref: "PR-0024",
  },
  {
    id: "pr2",
    title: "Săptămâna 1 Iun",
    subtitle: "142 angajați · 2–8 Iun 2026",
    period: "2–8 Iun 2026",
    employeeCount: 142,
    totalGross: 27900,
    netPaid: 19530,
    status: "done",
    type: "weekly",
    ref: "PR-0023",
  },
  {
    id: "pr3",
    title: "Săptămâna 4 Mai",
    subtitle: "140 angajați · 26 Mai – 1 Iun",
    period: "26 Mai – 1 Iun 2026",
    employeeCount: 140,
    totalGross: 27400,
    netPaid: 19180,
    status: "done",
    type: "weekly",
    ref: "PR-0022",
  },
  {
    id: "pr4",
    title: "Săptămâna 3 Mai",
    subtitle: "140 angajați · 19–25 Mai 2026",
    period: "19–25 Mai 2026",
    employeeCount: 140,
    totalGross: 26800,
    netPaid: 18760,
    status: "done",
    type: "weekly",
    ref: "PR-0021",
  },
  {
    id: "pr5",
    title: "Bonus Lunar Mai",
    subtitle: "142 angajați · 31 Mai 2026",
    period: "31 Mai 2026",
    employeeCount: 142,
    totalGross: 18600,
    netPaid: 13020,
    status: "done",
    type: "monthly",
    ref: "PR-0020",
  },
  {
    id: "pr6",
    title: "Bonus Q1",
    subtitle: "38 angajați · 15 Apr · Aprobare necesară",
    period: "15 Apr 2026",
    employeeCount: 38,
    totalGross: 14200,
    netPaid: 9940,
    status: "pending",
    type: "special",
    ref: "PR-0019",
  },
]

function computeMeta(records: PayrollRun[]): PayrollMeta {
  const processing = records.find((r) => r.status === "processing")
  return {
    currentRunAmount: processing?.totalGross ?? 28400,
    totalEmployees: 142,
    pendingCount: records.filter((r) => r.status === "pending").length,
    ytdCost: 327000,
    monthLabel: "Iun 2026",
    growthPct: 3.2,
  }
}

export const GET = withGates(
  { action: "payroll.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const type = req.nextUrl.searchParams.get("type")
    const results = type ? MOCK_RUNS.filter((r) => r.type === type) : MOCK_RUNS
    const meta = computeMeta(MOCK_RUNS)
    return NextResponse.json({ runs: results, count: results.length, meta })
  }
)
