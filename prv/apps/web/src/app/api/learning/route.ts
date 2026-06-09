import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { learningCourses, courseEnrollments, userAchievements, users } from "@prv/db/schema"
import { and, desc, eq, gt, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const LIMIT = 50

export type CourseStatus = "in_progress" | "completed" | "new" | "saved"
export type CourseCategory =
  | "safety"
  | "leadership"
  | "digital"
  | "finance"
  | "renovation"
  | "compliance"

export interface Course {
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
}

export interface Achievement {
  id: string
  label: string
  detail: string
  date: string
  colorType: "amber" | "green"
}

export interface LearningMeta {
  completedCount: number
  inProgressCount: number
  monthlyHours: number
  avgScore: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  safety: "Siguranță",
  leadership: "Leadership",
  digital: "Abilități Digitale",
  finance: "Finanțe",
  renovation: "Renovare",
  compliance: "Conformitate",
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

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function fmtShortDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
}

function fmtAchievementDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = req.nextUrl
    const statusFilter = searchParams.get("status") as CourseStatus | null
    const categoryFilter = searchParams.get("category") as CourseCategory | null
    const cursor = searchParams.get("cursor")
    const { companyId, userId } = ctx.session

    // 1. Fetch courses, user enrollments, and achievements in parallel
    const [courseRows, enrollmentRows, achievementRows] = await Promise.all([
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
            eq(learningCourses.companyId, companyId),
            eq(learningCourses.isActive, true),
            isNull(learningCourses.deletedAt),
            cursor ? gt(learningCourses.id, cursor) : undefined
          )
        )
        .orderBy(desc(learningCourses.isFeatured), desc(learningCourses.updatedAt))
        .limit(LIMIT + 1),

      db
        .select({
          courseId: courseEnrollments.courseId,
          status: courseEnrollments.status,
          progressPct: courseEnrollments.progressPct,
          currentModule: courseEnrollments.currentModule,
          updatedAt: courseEnrollments.updatedAt,
        })
        .from(courseEnrollments)
        .where(
          and(eq(courseEnrollments.companyId, companyId), eq(courseEnrollments.userId, userId))
        ),

      db
        .select({
          id: userAchievements.id,
          label: userAchievements.label,
          detail: userAchievements.detail,
          colorType: userAchievements.colorType,
          achievedAt: userAchievements.achievedAt,
        })
        .from(userAchievements)
        .where(and(eq(userAchievements.companyId, companyId), eq(userAchievements.userId, userId)))
        .orderBy(desc(userAchievements.achievedAt)),
    ])

    const hasMore = courseRows.length > LIMIT
    const pageRows = hasMore ? courseRows.slice(0, LIMIT) : courseRows
    const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null

    // 2. Index enrollments by courseId
    const enrollmentByCourse = new Map(enrollmentRows.map((e) => [e.courseId, e]))

    // 3. Assemble courses
    let courses: Course[] = pageRows.map((c) => {
      const enrollment = enrollmentByCourse.get(c.id)
      const category = c.category as CourseCategory
      return {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle ?? "",
        category,
        categoryLabel: CATEGORY_LABELS[category],
        status: (enrollment?.status ?? "new") as CourseStatus,
        progress: enrollment?.progressPct ?? 0,
        currentModule: enrollment?.currentModule ?? 0,
        totalModules: c.totalModules,
        durationLabel: fmtDuration(c.durationMinutes),
        hasCert: c.hasCert,
        isFeatured: c.isFeatured,
        instructorName:
          c.instructorFirstName && c.instructorLastName
            ? `${c.instructorFirstName} ${c.instructorLastName}`
            : "—",
        updatedDate: fmtShortDate(c.updatedAt),
        rating: c.rating,
        reviewCount: c.reviewCount,
      }
    })

    if (statusFilter) courses = courses.filter((c) => c.status === statusFilter)
    if (categoryFilter) courses = courses.filter((c) => c.category === categoryFilter)

    // 4. Assemble achievements
    const achievements: Achievement[] = achievementRows.map((a) => ({
      id: a.id,
      label: a.label,
      detail: a.detail ?? "",
      date: fmtAchievementDate(a.achievedAt),
      colorType: a.colorType as "amber" | "green",
    }))

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const courseById = new Map(pageRows.map((c) => [c.id, c]))

    const monthlyMinutes = enrollmentRows.reduce((acc, e) => {
      if (e.updatedAt < monthStart) return acc
      const course = courseById.get(e.courseId)
      if (!course) return acc
      return acc + Math.round((course.durationMinutes * e.progressPct) / 100)
    }, 0)

    const activeEnrollments = enrollmentRows.filter(
      (e) => e.status === "in_progress" || e.status === "completed"
    )
    const avgScore =
      activeEnrollments.length > 0
        ? Math.round(
            activeEnrollments.reduce((s, e) => s + e.progressPct, 0) / activeEnrollments.length
          )
        : 0

    const meta: LearningMeta = {
      completedCount: enrollmentRows.filter((e) => e.status === "completed").length,
      inProgressCount: enrollmentRows.filter((e) => e.status === "in_progress").length,
      monthlyHours: Math.round((monthlyMinutes / 60) * 10) / 10,
      avgScore,
    }

    return NextResponse.json({ courses, count: courses.length, meta, achievements, nextCursor })
  }
)
