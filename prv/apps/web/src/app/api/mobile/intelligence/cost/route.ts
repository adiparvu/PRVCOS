import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { getUsageStats } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId } = ctx
  const sp = req.nextUrl.searchParams

  const now = new Date()
  const year = parseInt(sp.get("year") ?? String(now.getFullYear()), 10)
  const month = parseInt(sp.get("month") ?? String(now.getMonth() + 1), 10)

  const stats = await getUsageStats(companyId, year, month)

  return NextResponse.json({ year, month, ...stats })
})
