import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { shifts } from "@prv/db/schema"
import { and, eq, gte, isNull, lte } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DAY_MS = 86_400_000
function parseISO(d: string): Date {
  const [y, m, dd] = d.split("-").map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, dd ?? 1))
}
const toISO = (d: Date): string => d.toISOString().slice(0, 10)
const addDaysISO = (iso: string, n: number): string =>
  toISO(new Date(parseISO(iso).getTime() + n * DAY_MS))

const bodySchema = z.object({
  sourceWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  targetWeekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
})

// POST /api/schedule/copy-week — duplicate a week of shifts to another week.
// Copies shift definitions only (not assignments), as fresh drafts.
export const POST = withGates(
  { action: "schedule.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }
    const { sourceWeekStart, targetWeekStart } = parsed.data

    const offset = Math.round(
      (parseISO(targetWeekStart).getTime() - parseISO(sourceWeekStart).getTime()) / DAY_MS
    )
    if (offset === 0) {
      return NextResponse.json({ error: "Source and target weeks are the same" }, { status: 400 })
    }

    const sourceEnd = addDaysISO(sourceWeekStart, 6)
    const src = await db
      .select({
        storeId: shifts.storeId,
        projectId: shifts.projectId,
        role: shifts.role,
        roleLabel: shifts.roleLabel,
        title: shifts.title,
        location: shifts.location,
        date: shifts.date,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        durationHours: shifts.durationHours,
        totalSlots: shifts.totalSlots,
      })
      .from(shifts)
      .where(
        and(
          eq(shifts.companyId, companyId),
          gte(shifts.date, sourceWeekStart),
          lte(shifts.date, sourceEnd),
          isNull(shifts.deletedAt)
        )
      )

    if (src.length === 0) return NextResponse.json({ copied: 0 })

    await db.insert(shifts).values(
      src.map((sh) => ({
        companyId,
        storeId: sh.storeId,
        projectId: sh.projectId,
        role: sh.role,
        roleLabel: sh.roleLabel,
        title: sh.title,
        location: sh.location,
        date: addDaysISO(sh.date, offset),
        startTime: sh.startTime,
        endTime: sh.endTime,
        durationHours: sh.durationHours,
        totalSlots: sh.totalSlots,
        status: "draft" as const,
      }))
    )

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "schedule.copy_week",
      entityType: "shift",
      entityId: targetWeekStart,
      payload: { sourceWeekStart, targetWeekStart, copied: src.length },
      method: "POST",
      path: "/api/schedule/copy-week",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ copied: src.length }, { status: 201 })
  }
)
