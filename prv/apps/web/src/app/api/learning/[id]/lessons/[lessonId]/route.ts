import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest): { courseId: string; lessonId: string } {
  const parts = req.nextUrl.pathname.split("/")
  const lessonIdx = parts.indexOf("lessons")
  return {
    courseId: lessonIdx > 0 ? (parts[lessonIdx - 1] ?? "") : "",
    lessonId: lessonIdx > 0 ? (parts[lessonIdx + 1] ?? "") : "",
  }
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseLessons, quizQuestions, quizOptions, learningCourses } =
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
      .select()
      .from(courseLessons)
      .where(
        and(
          eq(courseLessons.id, lessonId),
          eq(courseLessons.courseId, courseId),
          eq(courseLessons.companyId, companyId),
          eq(courseLessons.isActive, true),
          isNull(courseLessons.deletedAt)
        )
      )
      .limit(1)

    if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let questions: Array<{
      id: string
      questionText: string
      sortOrder: number
      options: Array<{ id: string; text: string; sortOrder: number }>
    }> = []

    if (lesson.type === "quiz") {
      const questionRows = await db
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

      const qMap = new Map<string, (typeof questions)[number]>()
      for (const row of questionRows) {
        if (!qMap.has(row.id)) {
          qMap.set(row.id, {
            id: row.id,
            questionText: row.questionText,
            sortOrder: row.sortOrder,
            options: [],
          })
        }
        if (row.optionId) {
          qMap
            .get(row.id)!
            .options.push({
              id: row.optionId,
              text: row.optionText ?? "",
              sortOrder: row.optionSortOrder,
            })
        }
      }
      questions = Array.from(qMap.values())
    }

    return NextResponse.json({ lesson, questions })
  }
)

const patchLessonSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  type: z.enum(["video", "text", "quiz", "document"]).optional(),
  content: z.string().optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  moduleId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export const PATCH = withGates(
  { action: "learning.manage", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseLessons, learningCourses } = await import("@prv/db/schema")
    const { and, eq, isNull } = await import("drizzle-orm")

    const { courseId, lessonId } = ids(req)
    const { companyId, userId } = ctx.session

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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchLessonSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [updated] = await db
      .update(courseLessons)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(courseLessons.id, lessonId),
          eq(courseLessons.courseId, courseId),
          eq(courseLessons.companyId, companyId),
          isNull(courseLessons.deletedAt)
        )
      )
      .returning({ id: courseLessons.id })

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.manage",
      entityType: "course_lesson",
      entityId: lessonId,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ok: true })
  }
)

export const DELETE = withGates(
  { action: "learning.manage", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseLessons, learningCourses } = await import("@prv/db/schema")
    const { and, eq, isNull } = await import("drizzle-orm")

    const { courseId, lessonId } = ids(req)
    const { companyId, userId } = ctx.session

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

    const [existing] = await db
      .select({ id: courseLessons.id, title: courseLessons.title })
      .from(courseLessons)
      .where(
        and(
          eq(courseLessons.id, lessonId),
          eq(courseLessons.courseId, courseId),
          eq(courseLessons.companyId, companyId),
          isNull(courseLessons.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(courseLessons)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(and(eq(courseLessons.id, lessonId), eq(courseLessons.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.manage",
      entityType: "course_lesson",
      entityId: lessonId,
      payload: { title: existing.title },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
