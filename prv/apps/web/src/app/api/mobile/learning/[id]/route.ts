import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { learningCourses, courseEnrollments, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type CourseStatus = "in_progress" | "completed" | "new" | "saved"
type CourseCategory = "safety" | "leadership" | "digital" | "finance" | "renovation" | "compliance"

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  safety: "Safety",
  leadership: "Leadership",
  digital: "Digital Skills",
  finance: "Finance",
  renovation: "Renovation",
  compliance: "Compliance",
}

const MONTH_LABELS = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"] as const

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const courseId = req.nextUrl.pathname.split("/").at(-1) ?? ""
  if (!courseId) return NextResponse.json({ error: "Missing course ID" }, { status: 400 })

  const { companyId, userId } = ctx

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
          eq(learningCourses.id, courseId),
          eq(learningCourses.companyId, companyId),
          eq(learningCourses.isActive, true),
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
      .where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)))
      .limit(1),
  ])

  const row = courseRows[0]
  if (!row) return NextResponse.json({ error: "Course not found", code: "NOT_FOUND" }, { status: 404 })

  const enrollment = enrollmentRows[0]
  const category = row.category as CourseCategory
  const currentModule = enrollment?.currentModule ?? 0
  const enrollStatus = (enrollment?.status ?? "new") as CourseStatus

  const course = {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    category,
    categoryLabel: CATEGORY_LABELS[category],
    status: enrollStatus,
    progress: enrollment?.progressPct ?? 0,
    currentModule,
    totalModules: row.totalModules,
    durationLabel: fmtDuration(row.durationMinutes),
    hasCert: row.hasCert,
    isFeatured: row.isFeatured,
    instructorName:
      row.instructorFirstName && row.instructorLastName
        ? `${row.instructorFirstName} ${row.instructorLastName}`
        : "—",
    updatedDate: `${row.updatedAt.getDate()} ${MONTH_LABELS[row.updatedAt.getMonth()]} ${row.updatedAt.getFullYear()}`,
    rating: row.rating,
    reviewCount: row.reviewCount,
    modules: [],
  }

  return NextResponse.json({ course })
})
