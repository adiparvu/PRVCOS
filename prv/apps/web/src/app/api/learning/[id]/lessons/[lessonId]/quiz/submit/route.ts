import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest): { courseId: string; lessonId: string } {
  const parts = req.nextUrl.pathname.split("/")
  const submitIdx = parts.indexOf("submit")
  return {
    lessonId: submitIdx > 1 ? (parts[submitIdx - 2] ?? "") : "",
    courseId: submitIdx > 4 ? (parts[submitIdx - 4] ?? "") : "",
  }
}

const submitSchema = z.object({
  answers: z.record(z.string(), z.string()),
})

export const POST = withGates(
  { action: "learning.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const {
      quizQuestions,
      quizOptions,
      quizAttempts,
      lessonProgress,
      courseLessons,
      learningCourses,
    } = await import("@prv/db/schema")
    const { and, eq, isNull } = await import("drizzle-orm")

    const { courseId, lessonId } = ids(req)
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

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
      .select({ id: courseLessons.id, type: courseLessons.type })
      .from(courseLessons)
      .where(
        and(
          eq(courseLessons.id, lessonId),
          eq(courseLessons.courseId, courseId),
          isNull(courseLessons.deletedAt)
        )
      )
      .limit(1)

    if (!lesson || lesson.type !== "quiz")
      return NextResponse.json({ error: "Lesson not found or not a quiz" }, { status: 404 })

    const [questionRows, allOptionRows] = await Promise.all([
      db
        .select({ id: quizQuestions.id, questionText: quizQuestions.questionText })
        .from(quizQuestions)
        .where(eq(quizQuestions.lessonId, lessonId)),

      db
        .select({
          id: quizOptions.id,
          questionId: quizOptions.questionId,
          isCorrect: quizOptions.isCorrect,
          explanation: quizOptions.explanation,
        })
        .from(quizOptions)
        .innerJoin(quizQuestions, eq(quizOptions.questionId, quizQuestions.id))
        .where(eq(quizQuestions.lessonId, lessonId)),
    ])

    const correctByQuestion = new Map<string, string>()
    const explanationByOption = new Map<string, string | null>()
    for (const opt of allOptionRows) {
      if (opt.isCorrect) correctByQuestion.set(opt.questionId, opt.id)
      explanationByOption.set(opt.id, opt.explanation ?? null)
    }

    const totalQuestions = questionRows.length
    let correctAnswers = 0
    const answerResults: Record<
      string,
      { correct: boolean; correctOptionId: string; explanation?: string }
    > = {}

    for (const q of questionRows) {
      const selectedOptionId = parsed.data.answers[q.id]
      const correctOptionId = correctByQuestion.get(q.id) ?? ""
      const correct = selectedOptionId === correctOptionId
      if (correct) correctAnswers++
      const explanation = selectedOptionId
        ? (explanationByOption.get(selectedOptionId) ?? undefined)
        : undefined
      answerResults[q.id] = { correct, correctOptionId, ...(explanation ? { explanation } : {}) }
    }

    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const passScore = course.passScore ?? 70
    const status = score >= passScore ? "passed" : "failed"

    await db.insert(quizAttempts).values({
      lessonId,
      userId,
      companyId,
      courseId,
      score,
      status,
      totalQuestions,
      correctAnswers,
    })

    if (status === "passed") {
      await db
        .insert(lessonProgress)
        .values({
          lessonId,
          userId,
          companyId,
          courseId,
          completedAt: new Date(),
          timeSpentSeconds: 0,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.lessonId, lessonProgress.userId],
          set: { completedAt: new Date() },
        })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.read",
      entityType: "quiz_attempt",
      entityId: lessonId,
      payload: { score, status, correctAnswers, totalQuestions },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({
      score,
      status,
      correctAnswers,
      totalQuestions,
      answers: answerResults,
    })
  }
)
