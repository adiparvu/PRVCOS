import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.anomalies.read", endpointClass: "api_read" },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    return NextResponse.json({
      anomalies: [
        {
          type: "risk",
          severity: "high",
          domain: "Revenue",
          title: "Invoice overdue risk increasing",
          description:
            "Andronic Group SRL has not responded to 2 payment reminders. High probability of default if not contacted today.",
          metric: "62% default risk",
          actionLabel: "Contact Client",
          href: "/crm",
        },
        {
          type: "spike",
          severity: "medium",
          domain: "Expenses",
          title: "Procurement costs up 18%",
          description:
            "3 unapproved purchases detected this week. Romstal SRL, BricoStore, Leroy Merlin. Total: €4,620.",
          metric: "€4,620 unreviewed",
          actionLabel: "Review",
          href: "/operations/inventory",
        },
        {
          type: "opportunity",
          severity: "low",
          domain: "Operations",
          title: "Floreasca — top performer",
          description:
            "Operations efficiency up 8% week-on-week. Zero open tasks overdue. Customer satisfaction: 4.9/5.",
          metric: "+8% efficiency",
          actionLabel: "View Store",
          href: "/operations",
        },
        {
          type: "risk",
          severity: "medium",
          domain: "Workforce",
          title: "Ion Popa — attendance pattern",
          description:
            "3rd consecutive late arrival this week. Manager review recommended before formal HR process.",
          metric: "3 incidents",
          actionLabel: "View Profile",
          href: "/people",
        },
      ],
    })
  }
)
