import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type InspectionStatus = "scheduled" | "in_progress" | "completed" | "overdue"

export interface InspectionSummary {
  id: string
  title: string
  status: InspectionStatus
  scheduledAt: string
  completedAt: string | null
  score: number | null
  maxScore: number | null
  assignedToName: string | null
  recurrenceWeeks: number | null
}

export interface InspectionsMeta {
  total: number
  scheduled: number
  inProgress: number
  completed: number
  overdue: number
}

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    return NextResponse.json({
      inspections: [],
      meta: {
        total: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      },
    })
  }
)
