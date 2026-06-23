import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface BriefingSummary {
  id: string
  title: string
  category: string
  scheduledAt: string | null
  attendeeCount: number
  isActive: boolean
  createdAt: string
}

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    return NextResponse.json({ briefings: [] })
  }
)
