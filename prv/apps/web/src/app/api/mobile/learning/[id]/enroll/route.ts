import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { courseEnrollments, learningCourses } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { inngest } from "@prv/jobs/client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function courseId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const idx = parts.indexOf("enroll")
  return idx > 0 ? (parts[idx - 1] ?? "") : ""
}

// ─── POST /api/mobile/learning/[id]/enroll ────────────────────────────────────

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const id = courseId(req)
  const { companyId, userId } = ctx

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

  if (!course)
    return NextResponse.json({ error: "Course not found", code: "NOT_FOUND" }, { status: 404 })

  await db
    .insert(courseEnrollments)
    .values({
      companyId,
      userId,
      courseId: id,
      status: "in_progress",
      progressPct: 0,
      currentModule: 0,
    })
    .onConflictDoUpdate({
      target: [courseEnrollments.userId, courseEnrollments.courseId],
      set: { status: "in_progress", updatedAt: new Date() },
    })

  return NextResponse.json({ courseId: id, status: "in_progress" }, { status: 201 })
})

// ─── PATCH /api/mobile/learning/[id]/enroll ───────────────────────────────────

const progressSchema = z.object({
  progressPct: z.number().int().min(0).max(100),
  currentModule: z.number().int().nonnegative().optional(),
  status: z.enum(["in_progress", "completed", "saved"]).optional(),
})

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const id = courseId(req)
  const { companyId, userId } = ctx

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = progressSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 422 }
    )

  const [enrollment] = await db
    .select({ userId: courseEnrollments.userId })
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, id)))
    .limit(1)

  if (!enrollment)
    return NextResponse.json({ error: "Not enrolled in this course" }, { status: 404 })

  const isCompleting = parsed.data.progressPct === 100 || parsed.data.status === "completed"
  const autoStatus = isCompleting ? "completed" : (parsed.data.status ?? undefined)

  const [updated] = await db
    .update(courseEnrollments)
    .set({
      progressPct: parsed.data.progressPct,
      ...(parsed.data.currentModule !== undefined
        ? { currentModule: parsed.data.currentModule }
        : {}),
      ...(autoStatus ? { status: autoStatus } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, id),
        eq(courseEnrollments.companyId, companyId)
      )
    )
    .returning({ id: courseEnrollments.id })

  if (isCompleting && updated) {
    const [course] = await db
      .select({
        title: learningCourses.title,
        category: learningCourses.category,
      })
      .from(learningCourses)
      .where(and(eq(learningCourses.id, id), isNull(learningCourses.deletedAt)))
      .limit(1)

    if (course) {
      void inngest.send({
        name: "prv/learning.course_completed",
        data: {
          enrollmentId: updated.id,
          courseId: id,
          userId,
          companyId,
          courseTitle: course.title,
          courseCategory: course.category ?? "general",
          completedAt: new Date().toISOString(),
        },
      })
    }
  }

  return NextResponse.json({ courseId: id, progressPct: parsed.data.progressPct })
})
