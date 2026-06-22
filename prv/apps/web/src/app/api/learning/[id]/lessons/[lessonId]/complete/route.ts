import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest): { courseId: string; lessonId: string } {
  const parts = req.nextUrl.pathname.split("/")
  const completeIdx = parts.indexOf("complete")
  return {
    lessonId: completeIdx > 0 ? (parts[completeIdx - 1] ?? "") : "",
    courseId: completeIdx > 2 ? (parts[completeIdx - 3] ?? "") : "",
  }
}

const completeSchema = z.object({
  timeSpentSeconds: z.number().int().nonnegative().optional(),
})

export const POST = withGates(
  { action: "learning.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const {
      lessonProgress,
      courseLessons,
      courseEnrollments,
      learningCourses,
      courseCertificates,
    } = await import("@prv/db/schema")
    const { and, eq, isNull, count } = await import("drizzle-orm")

    const { courseId, lessonId } = ids(req)
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json().catch(() => ({}))
    } catch {
      body = {}
    }

    const parsed = completeSchema.safeParse(body)
    const timeSpent = parsed.success ? (parsed.data.timeSpentSeconds ?? 0) : 0

    const [course] = await db
      .select({ id: learningCourses.id, passScore: learningCourses.passScore })
      .from(learningCourses)
      .where(
        and(
          eq(learningCourses.id, courseId),
          eq(learningCourses.companyId, companyId),
          isNull(learningCourses.deletedAt)
        )
      )
      .limit(1)

    if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [lesson] = await db
      .select({ id: courseLessons.id })
      .from(courseLessons)
      .where(
        and(
          eq(courseLessons.id, lessonId),
          eq(courseLessons.courseId, courseId),
          isNull(courseLessons.deletedAt)
        )
      )
      .limit(1)

    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })

    await db
      .insert(lessonProgress)
      .values({
        lessonId,
        userId,
        companyId,
        courseId,
        completedAt: new Date(),
        timeSpentSeconds: timeSpent,
      })
      .onConflictDoUpdate({
        target: [lessonProgress.lessonId, lessonProgress.userId],
        set: { completedAt: new Date(), timeSpentSeconds: timeSpent },
      })

    const [totalLessonsRes, completedLessonsRes] = await Promise.all([
      db
        .select({ count: count() })
        .from(courseLessons)
        .where(
          and(
            eq(courseLessons.courseId, courseId),
            eq(courseLessons.isActive, true),
            isNull(courseLessons.deletedAt)
          )
        ),
      db
        .select({ count: count() })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.courseId, courseId), eq(lessonProgress.userId, userId))),
    ])

    const totalLessons = totalLessonsRes[0]?.count ?? 0
    const completedLessons = completedLessonsRes[0]?.count ?? 0
    const newProgress =
      totalLessons > 0 ? Math.round((Number(completedLessons) / Number(totalLessons)) * 100) : 0
    const courseCompleted = newProgress >= 100

    const now = new Date()

    const [enrollment] = await db
      .select({ id: courseEnrollments.id, status: courseEnrollments.status })
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)))
      .limit(1)

    if (enrollment) {
      await db
        .update(courseEnrollments)
        .set({
          progressPct: newProgress,
          ...(courseCompleted && { status: "completed", completedAt: now }),
          updatedAt: now,
        })
        .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)))
    } else {
      await db.insert(courseEnrollments).values({
        courseId,
        userId,
        companyId,
        status: courseCompleted ? "completed" : "in_progress",
        progressPct: newProgress,
        currentModule: 0,
        ...(courseCompleted && { completedAt: now }),
      })
    }

    if (courseCompleted) {
      await db
        .insert(courseCertificates)
        .values({
          courseId,
          userId,
          companyId,
          issuedAt: now,
          certificateUrl: `/api/learning/${courseId}/certificate/download`,
        })
        .onConflictDoNothing()

      void fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/learning/${courseId}/certificate`, {
        method: "POST",
        headers: { "x-internal": "1" },
      }).catch(() => undefined)
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.read",
      entityType: "lesson_progress",
      entityId: lessonId,
      payload: { courseId, courseCompleted, newProgress },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true, courseCompleted, newProgress })
  }
)
