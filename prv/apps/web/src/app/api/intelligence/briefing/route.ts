import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { cacheMemo } from "@prv/cache"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export const GET = withGates(
  { action: "intelligence.briefing.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const data = await cacheMemo(
      "ai_briefing",
      companyId,
      async () => ({
        kpis: {
          revenue: { value: "€482K", trend: "+12.4%", dir: "up" },
          profit: { value: "€138K", trend: "+8.1%", dir: "up" },
          staffIn: { value: 142, trend: "3 absent", dir: "flat" },
          activeJobs: { value: 38, trend: "4 new", dir: "up" },
        },
        alerts: [
          {
            type: "error",
            title: "2 invoices overdue",
            description: "€3,240 outstanding · Andronic Group & Biroul Construct",
            href: "/finance/invoices",
          },
          {
            type: "warning",
            title: "Inventory low — Floreasca",
            description: "12 critical items below reorder point",
            href: "/operations/inventory",
          },
        ],
        recommendation: {
          badge: "Action required",
          text: "Approve the €28,400 payroll run by 14:00 today to avoid salary delays for 142 employees.",
          ctaLabel: "Approve Payroll",
          ctaHref: "/finance/payroll",
        },
      }),
      { ttl: 120 }
    )

    return NextResponse.json({
      greeting: getGreeting(),
      timestamp: new Date().toISOString(),
      ...data,
    })
  }
)
