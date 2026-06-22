import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "learning.manage", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseEnrollments, learningCourses, courseMandatoryAssignments, quizAttempts } =
      await import("@prv/db/schema")
    const { and, eq, isNull, avg, count, sql } = await import("drizzle-orm")

    const { companyId } = ctx.session
    const { searchParams } = req.nextUrl
    const filterCourseId = searchParams.get("courseId")
    const filterStatus = searchParams.get("status")

    const enrollmentFilter = and(
      eq(courseEnrollments.companyId, companyId),
      filterCourseId ? eq(courseEnrollments.courseId, filterCourseId) : undefined,
      filterStatus
        ? eq(
            courseEnrollments.status,
            filterStatus as "new" | "in_progress" | "completed" | "saved"
          )
        : undefined
    )

    const [enrollmentRows, courseRows, mandatoryRows, attemptRows] = await Promise.all([
      db
        .select({
          courseId: courseEnrollments.courseId,
          status: courseEnrollments.status,
          progressPct: courseEnrollments.progressPct,
        })
        .from(courseEnrollments)
        .where(enrollmentFilter),

      db
        .select({
          id: learningCourses.id,
          title: learningCourses.title,
        })
        .from(learningCourses)
        .where(
          and(
            eq(learningCourses.companyId, companyId),
            eq(learningCourses.isActive, true),
            isNull(learningCourses.deletedAt),
            filterCourseId ? eq(learningCourses.id, filterCourseId) : undefined
          )
        ),

      db
        .select({ id: courseMandatoryAssignments.id, userId: courseMandatoryAssignments.userId })
        .from(courseMandatoryAssignments)
        .where(eq(courseMandatoryAssignments.companyId, companyId)),

      db
        .select({ lessonId: quizAttempts.lessonId, score: quizAttempts.score })
        .from(quizAttempts)
        .where(eq(quizAttempts.companyId, companyId)),
    ])

    void avg
    void sql
    void count

    const totalEnrollments = enrollmentRows.length
    const completedEnrollments = enrollmentRows.filter((e) => e.status === "completed").length
    const completionRate =
      totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0

    const scoresFromAttempts = attemptRows.map((a) => a.score)
    const averageScore =
      scoresFromAttempts.length > 0
        ? Math.round(scoresFromAttempts.reduce((s, v) => s + v, 0) / scoresFromAttempts.length)
        : 0

    const mandatoryUserIds = new Set(mandatoryRows.map((m) => m.userId).filter(Boolean))
    const mandatoryTotal = mandatoryUserIds.size
    const mandatoryCompleted = enrollmentRows.filter((e) => e.status === "completed").length
    const mandatoryCompliance =
      mandatoryTotal > 0 ? Math.round((mandatoryCompleted / mandatoryTotal) * 100) : 0

    const courseMap = new Map(courseRows.map((c) => [c.id, c]))

    const byCourseMap = new Map<
      string,
      { courseId: string; title: string; enrolled: number; completed: number; scores: number[] }
    >()

    for (const e of enrollmentRows) {
      if (!byCourseMap.has(e.courseId)) {
        const course = courseMap.get(e.courseId)
        byCourseMap.set(e.courseId, {
          courseId: e.courseId,
          title: course?.title ?? e.courseId,
          enrolled: 0,
          completed: 0,
          scores: [],
        })
      }
      const entry = byCourseMap.get(e.courseId)!
      entry.enrolled++
      if (e.status === "completed") entry.completed++
    }

    for (const attempt of attemptRows) {
      void attempt
    }

    const byCourse = Array.from(byCourseMap.values()).map((c) => ({
      courseId: c.courseId,
      title: c.title,
      enrolled: c.enrolled,
      completed: c.completed,
      averageScore:
        c.scores.length > 0 ? Math.round(c.scores.reduce((s, v) => s + v, 0) / c.scores.length) : 0,
    }))

    return NextResponse.json({
      totalEnrollments,
      completionRate,
      averageScore,
      mandatoryCompliance,
      byDepartment: [],
      byCourse,
    })
  }
)
