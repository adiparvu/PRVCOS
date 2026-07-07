import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { courseEnrollments, learningCourses } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import {
  computeLearningCompletion,
  type LearningCompletion,
  type EnrollmentStatus,
} from "@/lib/learning-completion"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type LearningCompletionResponse = LearningCompletion

// GET /api/analytics/learning-completion — course completion: status mix,
// overall completion rate and average progress, per-course breakdown.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        courseId: courseEnrollments.courseId,
        status: courseEnrollments.status,
        progressPct: courseEnrollments.progressPct,
        courseTitle: learningCourses.title,
      })
      .from(courseEnrollments)
      .leftJoin(learningCourses, eq(courseEnrollments.courseId, learningCourses.id))
      .where(eq(courseEnrollments.companyId, ctx.session.companyId))

    const completion = computeLearningCompletion(
      rows.map((r) => ({
        courseId: r.courseId,
        courseTitle: r.courseTitle ?? "Untitled course",
        status: r.status as EnrollmentStatus,
        progressPct: r.progressPct ?? 0,
      }))
    )

    return NextResponse.json(completion)
  }
)
