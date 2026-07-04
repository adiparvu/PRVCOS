import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { notificationPreferences } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { isWithinQuietHours } from "@/lib/notification-delivery"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface QuietStatusResponse {
  quietHours: { start: string; end: string } | null
  currentlyQuiet: boolean
  now: string // the HH:MM used for the evaluation
}

function serverHHMM(): string {
  const d = new Date()
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

// GET /api/notifications/quiet-status[?now=HH:MM] — whether the user is currently
// within their quiet-hours window. The client passes its local HH:MM via `now`
// (quiet hours are stored in the user's timezone); server UTC is the fallback.
export const GET = withGates(
  { action: "notifications.preferences.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const nowParam = req.nextUrl.searchParams.get("now")
    const now = nowParam && /^\d{1,2}:\d{2}$/.test(nowParam) ? nowParam : serverHHMM()

    const [pref] = await db
      .select({
        quietHoursStart: notificationPreferences.quietHoursStart,
        quietHoursEnd: notificationPreferences.quietHoursEnd,
      })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, ctx.session.userId),
          eq(notificationPreferences.companyId, ctx.session.companyId)
        )
      )
      .limit(1)

    const start = pref?.quietHoursStart ?? null
    const end = pref?.quietHoursEnd ?? null
    const currentlyQuiet = isWithinQuietHours(start, end, now)

    return NextResponse.json({
      quietHours: start && end ? { start, end } : null,
      currentlyQuiet,
      now,
    })
  }
)
