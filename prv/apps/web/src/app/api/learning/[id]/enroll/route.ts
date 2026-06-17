import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { courseEnrollments, learningCourses } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function courseId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  const enrollIdx = parts.indexOf("enroll")
  return enrollIdx > 0 ? (parts[enrollIdx - 1] ?? "") : ""
}

// ─── POST /api/learning/[id]/enroll ──────────────────────────────────────────
// Enroll the current user in a course (upsert).

const enrollSchema = z.object({
  status: z.enum(["in_progress", "saved"]).optional(),
})

export const POST = withGates(
  { action: "learning.enroll", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = courseId(req)
    const { companyId, userId, sessionId } = ctx.session

    const [course] = await db
      .select({ id: learningCourses.id })
      .from(learningCourses)
      .where(
        and(
          eq(learningCourses.id, id),
          eq(learningCourses.companyId, companyId),
          eq(learningCourses.isActive, true),
          isNull(learningCourses.deletedAt)
        )
      )
      .limit(1)

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json().catch(() => ({}))
    } catch {
      body = {}
    }

    const parsed = enrollSchema.safeParse(body)
    const enrollStatus = parsed.success ? (parsed.data.status ?? "in_progress") : "in_progress"

    await db
      .insert(courseEnrollments)
      .values({ companyId, userId, courseId: id, status: enrollStatus, progressPct: 0, currentModule: 0 })
      .onConflictDoUpdate({
        target: [courseEnrollments.userId, courseEnrollments.courseId],
        set: { status: enrollStatus, updatedAt: new Date() },
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "learning.enroll",
      entityType: "course",
      entityId: id,
      payload: { status: enrollStatus },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ courseId: id, status: enrollStatus }, { status: 201 })
  }
)

// ─── PATCH /api/learning/[id]/enroll ─────────────────────────────────────────
// Update enrollment progress.

const progressSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
  currentModule: z.number().int().nonnegative().optional(),
  status: z.enum(["in_progress", "completed", "saved"]).optional(),
})

export const PATCH = withGates(
  { action: "learning.enroll", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = courseId(req)
    const { companyId, userId, sessionId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = progressSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })

    const [enrollment] = await db
      .select({ userId: courseEnrollments.userId })
      .from(courseEnrollments)
      .where(
        and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, id))
      )
      .limit(1)

    if (!enrollment) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 404 })

    const autoStatus =
      parsed.data.progressPct === 100 && !parsed.data.status ? "completed" : parsed.data.status

    await db
      .update(courseEnrollments)
      .set({
        progressPct: parsed.data.progressPct,
        ...(parsed.data.currentModule !== undefined ? { currentModule: parsed.data.currentModule } : {}),
        ...(autoStatus ? { status: autoStatus } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, id)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "learning.enroll",
      entityType: "course",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ courseId: id, progressPct: parsed.data.progressPct })
  }
)
