import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { attendanceRecords, tasks, performanceRatings, users } from "@prv/db/schema"
import { and, eq, gte, lte, isNull } from "drizzle-orm"
import { z } from "zod"
import { computePerformance } from "@/lib/performance"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PerformanceRow {
  userId: string
  name: string
  jobTitle: string | null
  scheduledDays: number
  presentDays: number
  attendanceRate: number | null
  punctualityRate: number | null
  taskCompletionRate: number | null
  ratingPct: number | null
  rating: number | null
  composite: number | null
}

export interface PerformanceSummary {
  people: number
  avgAttendance: number | null
  avgPunctuality: number | null
  avgTaskCompletion: number | null
  avgComposite: number | null
  topPerformerId: string | null
  needsAttentionId: string | null
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function avg(nums: (number | null)[]): number | null {
  const vals = nums.filter((n): n is number => n != null)
  if (!vals.length) return null
  return Math.round((vals.reduce((s, n) => s + n, 0) / vals.length) * 10) / 10
}

// GET /api/workforce/performance?from=&to= — the team performance dashboard.
// Derives attendance, punctuality and task-completion rates per employee from
// existing attendance + task data, folds in the latest manager rating, and
// returns a composite score + team summary. Defaults to the last 30 days.
export const GET = withGates(
  { action: "workforce.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cid = ctx.session.companyId
    const sp = req.nextUrl.searchParams
    const now = new Date()
    const rawFrom = sp.get("from")
    const rawTo = sp.get("to")
    const to = rawTo && ISO.test(rawTo) ? rawTo : isoDay(now)
    const from =
      rawFrom && ISO.test(rawFrom) ? rawFrom : isoDay(new Date(now.getTime() - 30 * 86_400_000))

    const [attRows, taskRows, ratingRows, userRows] = await Promise.all([
      db
        .select({
          userId: attendanceRecords.userId,
          status: attendanceRecords.status,
          lateMinutes: attendanceRecords.lateMinutes,
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.companyId, cid),
            gte(attendanceRecords.date, from),
            lte(attendanceRecords.date, to)
          )
        ),
      db
        .select({ assigneeUserId: tasks.assigneeUserId, status: tasks.status })
        .from(tasks)
        .where(and(eq(tasks.companyId, cid), isNull(tasks.deletedAt))),
      db
        .select({
          userId: performanceRatings.userId,
          rating: performanceRatings.rating,
          createdAt: performanceRatings.createdAt,
        })
        .from(performanceRatings)
        .where(eq(performanceRatings.companyId, cid)),
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: users.jobTitle,
        })
        .from(users)
        .where(and(eq(users.companyId, cid), eq(users.isActive, true))),
    ])

    interface Acc {
      scheduledDays: number
      presentDays: number
      onTimeDays: number
      totalTasks: number
      doneTasks: number
    }
    const acc = new Map<string, Acc>()
    const ensure = (id: string): Acc => {
      let a = acc.get(id)
      if (!a) {
        a = { scheduledDays: 0, presentDays: 0, onTimeDays: 0, totalTasks: 0, doneTasks: 0 }
        acc.set(id, a)
      }
      return a
    }

    for (const r of attRows) {
      if (r.status === "leave") continue // leave days aren't "scheduled"
      const a = ensure(r.userId)
      a.scheduledDays += 1
      const worked = r.status === "present" || r.status === "late" || r.status === "clocked_out"
      if (worked) {
        a.presentDays += 1
        if (r.status !== "late" && !(r.lateMinutes && r.lateMinutes > 0)) a.onTimeDays += 1
      }
    }
    for (const r of taskRows) {
      if (!r.assigneeUserId) continue
      const a = ensure(r.assigneeUserId)
      a.totalTasks += 1
      if (r.status === "done") a.doneTasks += 1
    }

    // Latest rating per user.
    const latestRating = new Map<string, { rating: number; at: number }>()
    for (const r of ratingRows) {
      const at = r.createdAt ? r.createdAt.getTime() : 0
      const cur = latestRating.get(r.userId)
      if (!cur || at >= cur.at) latestRating.set(r.userId, { rating: r.rating, at })
    }

    const nameOf = new Map(
      userRows.map((u) => [
        u.id,
        { name: `${u.firstName} ${u.lastName}`.trim(), jobTitle: u.jobTitle },
      ])
    )

    const rows: PerformanceRow[] = [...acc.entries()]
      .filter(([id]) => nameOf.has(id) || latestRating.has(id))
      .map(([userId, a]) => {
        const rating = latestRating.get(userId)?.rating ?? null
        const perf = computePerformance({ ...a, rating })
        const meta = nameOf.get(userId)
        return {
          userId,
          name: meta?.name ?? "Unknown",
          jobTitle: meta?.jobTitle ?? null,
          scheduledDays: a.scheduledDays,
          presentDays: a.presentDays,
          attendanceRate: perf.attendanceRate,
          punctualityRate: perf.punctualityRate,
          taskCompletionRate: perf.taskCompletionRate,
          ratingPct: perf.ratingPct,
          rating,
          composite: perf.composite,
        }
      })

    rows.sort((x, y) => (y.composite ?? -1) - (x.composite ?? -1))

    const withComposite = rows.filter((r) => r.composite != null)
    const summary: PerformanceSummary = {
      people: rows.length,
      avgAttendance: avg(rows.map((r) => r.attendanceRate)),
      avgPunctuality: avg(rows.map((r) => r.punctualityRate)),
      avgTaskCompletion: avg(rows.map((r) => r.taskCompletionRate)),
      avgComposite: avg(rows.map((r) => r.composite)),
      topPerformerId: withComposite[0]?.userId ?? null,
      needsAttentionId: withComposite.length
        ? withComposite[withComposite.length - 1]!.userId
        : null,
    }

    return NextResponse.json({ rows, summary, range: { from, to } })
  }
)

// POST /api/workforce/performance — record a manager rating for a period.
const postSchema = z.object({
  userId: z.string().uuid(),
  period: z.string().min(4).max(20),
  rating: z.number().int().min(1).max(5),
  note: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "workforce.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [record] = await db
      .insert(performanceRatings)
      .values({
        companyId,
        userId: d.userId,
        ratedByUserId: actorId,
        period: d.period,
        rating: d.rating,
        note: d.note ?? null,
      })
      .onConflictDoUpdate({
        target: [performanceRatings.userId, performanceRatings.period],
        set: {
          rating: d.rating,
          note: d.note ?? null,
          ratedByUserId: actorId,
          updatedAt: new Date(),
        },
      })
      .returning({ id: performanceRatings.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "workforce.performance.rate",
      entityType: "performance_rating",
      entityId: record?.id ?? d.userId,
      payload: { userId: d.userId, period: d.period, rating: d.rating },
      method: "POST",
      path: "/api/workforce/performance",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
