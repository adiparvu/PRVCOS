import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { learningCourses, courseEnrollments, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import type { CourseStatus, CourseCategory } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ModuleStatus = "done" | "active" | "locked"

export interface CourseModule {
  id: string
  index: number
  title: string
  durationLabel: string
  status: ModuleStatus
}

export interface CourseDetail {
  id: string
  title: string
  subtitle: string
  category: CourseCategory
  categoryLabel: string
  status: CourseStatus
  progress: number
  currentModule: number
  totalModules: number
  durationLabel: string
  hasCert: boolean
  isFeatured: boolean
  instructorName: string
  updatedDate: string
  rating: number
  reviewCount: number
  description: string
  modules: CourseModule[]
}

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  safety: "Safety",
  leadership: "Leadership",
  digital: "Digital Skills",
  finance: "Finance",
  renovation: "Renovation",
  compliance: "Compliance",
}

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
}

function fmtDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }
  return `${minutes} min`
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId } = ctx.session

    const [courseRows, enrollmentRows] = await Promise.all([
      db
        .select({
          id: learningCourses.id,
          title: learningCourses.title,
          subtitle: learningCourses.subtitle,
          category: learningCourses.category,
          totalModules: learningCourses.totalModules,
          durationMinutes: learningCourses.durationMinutes,
          hasCert: learningCourses.hasCert,
          isFeatured: learningCourses.isFeatured,
          rating: learningCourses.rating,
          reviewCount: learningCourses.reviewCount,
          updatedAt: learningCourses.updatedAt,
          instructorFirstName: users.firstName,
          instructorLastName: users.lastName,
        })
        .from(learningCourses)
        .leftJoin(users, eq(learningCourses.instructorUserId, users.id))
        .where(
          and(
            eq(learningCourses.id, id),
            eq(learningCourses.companyId, companyId),
            isNull(learningCourses.deletedAt)
          )
        )
        .limit(1),

      db
        .select({
          status: courseEnrollments.status,
          progressPct: courseEnrollments.progressPct,
          currentModule: courseEnrollments.currentModule,
        })
        .from(courseEnrollments)
        .where(and(eq(courseEnrollments.courseId, id), eq(courseEnrollments.userId, userId)))
        .limit(1),
    ])

    const row = courseRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const enrollment = enrollmentRows[0] ?? null
    const status: CourseStatus = (enrollment?.status as CourseStatus) ?? "new"
    const progress = enrollment?.progressPct ?? 0
    const currentModule = enrollment?.currentModule ?? 0

    const instructorName = row.instructorFirstName
      ? `${row.instructorFirstName} ${row.instructorLastName}`
      : "—"

    const detail: CourseDetail = {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? "—",
      category: row.category as CourseCategory,
      categoryLabel: CATEGORY_LABELS[row.category as CourseCategory] ?? row.category,
      status,
      progress,
      currentModule,
      totalModules: row.totalModules,
      durationLabel: fmtDuration(row.durationMinutes),
      hasCert: row.hasCert,
      isFeatured: row.isFeatured,
      instructorName,
      updatedDate: fmtDate(row.updatedAt),
      rating: row.rating,
      reviewCount: row.reviewCount,
      description: row.subtitle ?? "",
      modules: [],
    }

    return NextResponse.json(detail)
  }
)

// ─── Enrollment state machine helpers ─────────────────────────────────────────

export type EnrollmentAction = "enroll" | "update_progress" | "complete" | "save"

export const ENROLLMENT_NEXT_STATUS: Record<EnrollmentAction, string> = {
  enroll: "in_progress",
  update_progress: "in_progress",
  complete: "completed",
  save: "saved",
}

export function enrollmentNextStatus(action: EnrollmentAction, currentStatus: string): string {
  if (action === "update_progress" && currentStatus === "completed") return "completed"
  return ENROLLMENT_NEXT_STATUS[action]
}

// ─── PATCH /api/learning/[id] — upsert enrollment ────────────────────────────

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enroll") }),
  z.object({
    action: z.literal("update_progress"),
    progressPct: z.number().int().min(0).max(100),
    currentModule: z.number().int().min(0).optional(),
  }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("save") }),
])

export const PATCH = withGates(
  { action: "learning.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [course] = await db
      .select({ id: learningCourses.id, title: learningCourses.title })
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

    const [existing] = await db
      .select({ id: courseEnrollments.id, status: courseEnrollments.status })
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.courseId, id), eq(courseEnrollments.userId, userId)))
      .limit(1)

    const d = parsed.data
    const nextStatus = enrollmentNextStatus(d.action, existing?.status ?? "new")

    const progressPct =
      d.action === "update_progress" ? d.progressPct : d.action === "complete" ? 100 : undefined
    const currentModule =
      d.action === "update_progress" ? (d.currentModule ?? undefined) : undefined

    if (existing) {
      await db
        .update(courseEnrollments)
        .set({
          status: nextStatus as "new" | "in_progress" | "completed" | "saved",
          ...(progressPct !== undefined && { progressPct }),
          ...(currentModule !== undefined && { currentModule }),
          ...(d.action === "complete" && { completedAt: new Date() }),
          updatedAt: new Date(),
        })
        .where(and(eq(courseEnrollments.courseId, id), eq(courseEnrollments.userId, userId)))
    } else {
      await db.insert(courseEnrollments).values({
        courseId: id,
        userId,
        companyId,
        status: nextStatus as "new" | "in_progress" | "completed" | "saved",
        progressPct: progressPct ?? 0,
        currentModule: currentModule ?? 0,
        ...(d.action === "complete" && { completedAt: new Date() }),
      })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.update",
      entityType: "course_enrollment",
      entityId: id,
      payload: { course: course.title, op: d.action, nextStatus },
      method: "PATCH",
      path: `/api/learning/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ courseId: id, status: nextStatus })
  }
)

// ─── DELETE /api/learning/[id] ────────────────────────────────────────────────

export const DELETE = withGates(
  { action: "learning.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [existing] = await db
      .select({ id: learningCourses.id, title: learningCourses.title })
      .from(learningCourses)
      .where(
        and(
          eq(learningCourses.id, id),
          eq(learningCourses.companyId, companyId),
          isNull(learningCourses.deletedAt)
        )
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(learningCourses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(learningCourses.id, id), eq(learningCourses.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.delete",
      entityType: "learning_course",
      entityId: id,
      payload: { title: existing.title },
      method: "DELETE",
      path: `/api/learning/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
