import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.forecast.read", endpointClass: "api_read" },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    return NextResponse.json({
      confidence: 87,
      series: [
        { month: "Jan", actual: 320 },
        { month: "Feb", actual: 348 },
        { month: "Mar", actual: 360 },
        { month: "Apr", actual: 402 },
        { month: "May", actual: 438 },
        { month: "Jun", actual: 482 },
        { month: "Jul", forecast: 519, lower: 493, upper: 545 },
        { month: "Aug", forecast: 557, lower: 520, upper: 594 },
        { month: "Sep", forecast: 591, lower: 548, upper: 634 },
      ],
      risks: [
        { domain: "Cash Flow", level: "low" },
        { domain: "Procurement", level: "medium" },
        { domain: "Receivables", level: "high" },
        { domain: "Workforce", level: "low" },
      ],
      opportunities: [
        {
          title: "Unbilled materials across 4 active projects",
          value: "+€12,400 billable now",
          href: "/projects",
        },
        {
          title: "2 project milestones ready to invoice",
          value: "+€8,200 ready",
          href: "/finance/invoices",
        },
        {
          title: "4 prospects ready for quote",
          value: "Est. €22,000 pipeline",
          href: "/crm",
        },
      ],
    })
  }
)
