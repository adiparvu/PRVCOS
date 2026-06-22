import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function courseId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const idx = parts.indexOf("lessons")
  return idx > 0 ? (parts[idx - 1] ?? "") : ""
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseLessons, courseModules, lessonProgress, learningCourses } =
      await import("@prv/db/schema")
    const { and, eq, isNull, asc } = await import("drizzle-orm")

    const id = courseId(req)
    const { companyId, userId } = ctx.session

    const [course] = await db
      .select({ id: learningCourses.id })
      .from(learningCourses)
      .where(
        and(
          eq(learningCourses.id, id),
          eq(learningCourses.companyId, companyId),
          isNull(learningCourses.deletedAt)
        )
      )
      .limit(1)

    if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [lessonRows, progressRows] = await Promise.all([
      db
        .select({
          id: courseLessons.id,
          title: courseLessons.title,
          type: courseLessons.type,
          durationMinutes: courseLessons.durationMinutes,
          sortOrder: courseLessons.sortOrder,
          moduleId: courseLessons.moduleId,
          moduleTitle: courseModules.title,
        })
        .from(courseLessons)
        .leftJoin(courseModules, eq(courseLessons.moduleId, courseModules.id))
        .where(
          and(
            eq(courseLessons.courseId, id),
            eq(courseLessons.companyId, companyId),
            eq(courseLessons.isActive, true),
            isNull(courseLessons.deletedAt)
          )
        )
        .orderBy(asc(courseLessons.moduleId), asc(courseLessons.sortOrder)),

      db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.courseId, id), eq(lessonProgress.userId, userId))),
    ])

    const completedSet = new Set(progressRows.map((p) => p.lessonId))

    const lessons = lessonRows.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      durationMinutes: l.durationMinutes,
      sortOrder: l.sortOrder,
      moduleId: l.moduleId,
      moduleTitle: l.moduleTitle ?? null,
      completedByUser: completedSet.has(l.id),
    }))

    return NextResponse.json({ lessons })
  }
)

const createLessonSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.enum(["video", "text", "quiz", "document"]).optional(),
  content: z.string().optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  moduleId: z.string().uuid().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const POST = withGates(
  { action: "learning.manage", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseLessons, learningCourses } = await import("@prv/db/schema")
    const { and, eq, isNull } = await import("drizzle-orm")

    const id = courseId(req)
    const { companyId, userId } = ctx.session

    const [course] = await db
      .select({ id: learningCourses.id })
      .from(learningCourses)
      .where(
        and(
          eq(learningCourses.id, id),
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

    const parsed = createLessonSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [record] = await db
      .insert(courseLessons)
      .values({ courseId: id, companyId, ...parsed.data })
      .returning({ id: courseLessons.id, title: courseLessons.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.manage",
      entityType: "course_lesson",
      entityId: record.id,
      payload: { courseId: id, ...parsed.data },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
  }
)
