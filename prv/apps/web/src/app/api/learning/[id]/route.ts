import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { learningCourses, courseEnrollments, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
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
