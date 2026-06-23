import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface IncidentDetail {
  id: string
  title: string
  type: string
  severity: string
  status: string
  location: string
  incidentAt: string
  injuriesCount: number
  description: string
  rootCause: string | null
  correctiveActions: string | null
  reporterName: string
  reporterId: string
  assignedToName: string | null
  assignedToId: string | null
  projectId: string | null
  createdAt: string
  updatedAt: string
}

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    return NextResponse.json(null)
  }
)

export const PATCH = withGates(
  { action: "safety.update", endpointClass: "api_write" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    void body
    return NextResponse.json({ ok: true })
  }
)
