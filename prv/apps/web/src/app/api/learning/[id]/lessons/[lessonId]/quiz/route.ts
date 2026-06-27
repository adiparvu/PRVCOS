import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest): { courseId: string; lessonId: string } {
  const parts = req.nextUrl.pathname.split("/")
  const quizIdx = parts.indexOf("quiz")
  return {
    lessonId: quizIdx > 0 ? (parts[quizIdx - 1] ?? "") : "",
    courseId: quizIdx > 2 ? (parts[quizIdx - 3] ?? "") : "",
  }
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { quizQuestions, quizOptions, courseLessons, learningCourses } =
      await import("@prv/db/schema")
    const { and, eq, isNull, asc } = await import("drizzle-orm")

    const { courseId, lessonId } = ids(req)
    const { companyId } = ctx.session

    const [course] = await db
      .select({ id: learningCourses.id })
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

    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    if (lesson.type !== "quiz")
      return NextResponse.json({ error: "Not a quiz lesson" }, { status: 400 })

    const rows = await db
      .select({
        id: quizQuestions.id,
        questionText: quizQuestions.questionText,
        sortOrder: quizQuestions.sortOrder,
        optionId: quizOptions.id,
        optionText: quizOptions.optionText,
        optionSortOrder: quizOptions.sortOrder,
      })
      .from(quizQuestions)
      .leftJoin(quizOptions, eq(quizOptions.questionId, quizQuestions.id))
      .where(eq(quizQuestions.lessonId, lessonId))
      .orderBy(asc(quizQuestions.sortOrder), asc(quizOptions.sortOrder))

    const qMap = new Map<
      string,
      {
        id: string
        questionText: string
        sortOrder: number
        options: Array<{ id: string; text: string }>
      }
    >()

    for (const row of rows) {
      if (!qMap.has(row.id)) {
        qMap.set(row.id, {
          id: row.id,
          questionText: row.questionText,
          sortOrder: row.sortOrder ?? 0,
          options: [],
        })
      }
      if (row.optionId) {
        qMap.get(row.id)!.options.push({ id: row.optionId, text: row.optionText ?? "" })
      }
    }

    const questions = Array.from(qMap.values())

    return NextResponse.json({ questions })
  }
)
