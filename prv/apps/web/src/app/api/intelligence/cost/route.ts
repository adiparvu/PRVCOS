import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { getUsageStats } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<Response> => {
    const url = new URL(req.url)
    const now = new Date()
    const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()), 10)
    const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1), 10)

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 })
    }

    const stats = await getUsageStats(ctx.session.companyId, year, month)
    return NextResponse.json(stats)
  }
)
