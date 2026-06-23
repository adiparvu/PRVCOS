import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type IncidentSeverity = "low" | "medium" | "high" | "critical"
export type IncidentStatus = "open" | "under_investigation" | "resolved" | "closed"
export type IncidentType =
  | "accident"
  | "near_miss"
  | "hazard"
  | "property_damage"
  | "environmental"
  | "security"
export type InspectionStatus = "scheduled" | "in_progress" | "completed" | "overdue"

export interface IncidentSummary {
  id: string
  title: string
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  location: string
  incidentAt: string
  injuriesCount: number
  reporterName: string
  assignedToName: string | null
  projectId: string | null
  createdAt: string
}

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

export interface SafetyMeta {
  openIncidents: number
  criticalIncidents: number
  overdueInspections: number
  upcomingInspections: number
}

export interface SafetyDashboard {
  meta: SafetyMeta
  recentIncidents: IncidentSummary[]
  upcomingInspections: InspectionSummary[]
}

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    return NextResponse.json({
      meta: {
        openIncidents: 0,
        criticalIncidents: 0,
        overdueInspections: 0,
        upcomingInspections: 0,
      },
      recentIncidents: [],
      upcomingInspections: [],
    })
  }
)
