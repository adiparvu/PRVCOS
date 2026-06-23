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

export interface IncidentsMeta {
  total: number
  open: number
  underInvestigation: number
  resolved: number
  critical: number
}

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    return NextResponse.json({
      incidents: [],
      meta: {
        total: 0,
        open: 0,
        underInvestigation: 0,
        resolved: 0,
        critical: 0,
      },
    })
  }
)

export const POST = withGates(
  { action: "safety.create", endpointClass: "api_write" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    void body
    return NextResponse.json({ id: "stub" }, { status: 201 })
  }
)
