import { NextRequest, NextResponse } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { getUsageStats } from "@prv/ai-engine"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const { companyId } = ctx
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const stats = await getUsageStats(companyId, year, month)

  return NextResponse.json({ year, month, ...stats })
})
