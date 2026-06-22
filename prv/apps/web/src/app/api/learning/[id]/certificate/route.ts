import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function courseId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const idx = parts.indexOf("certificate")
  return idx > 0 ? (parts[idx - 1] ?? "") : ""
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseCertificates, learningCourses } = await import("@prv/db/schema")
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

    const [cert] = await db
      .select({
        id: courseCertificates.id,
        issuedAt: courseCertificates.issuedAt,
        expiresAt: courseCertificates.expiresAt,
        certificateUrl: courseCertificates.certificateUrl,
      })
      .from(courseCertificates)
      .where(and(eq(courseCertificates.courseId, id), eq(courseCertificates.userId, userId)))
      .limit(1)

    return NextResponse.json({
      certificate: cert
        ? {
            id: cert.id,
            issuedAt: cert.issuedAt,
            expiresAt: cert.expiresAt,
            certificateUrl: cert.certificateUrl,
          }
        : null,
    })
  }
)

export const POST = withGates(
  { action: "learning.read", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseCertificates, learningCourses, courseEnrollments } =
      await import("@prv/db/schema")
    const { and, eq, isNull } = await import("drizzle-orm")

    const id = courseId(req)
    const { companyId, userId } = ctx.session

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

    const [enrollment] = await db
      .select({ status: courseEnrollments.status })
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.courseId, id), eq(courseEnrollments.userId, userId)))
      .limit(1)

    if (!enrollment || enrollment.status !== "completed") {
      return NextResponse.json({ error: "Course not completed" }, { status: 403 })
    }

    const now = new Date()
    const certificatePath = `/certificates/${companyId}/${userId}/${id}.pdf`

    const [cert] = await db
      .insert(courseCertificates)
      .values({
        courseId: id,
        userId,
        companyId,
        issuedAt: now,
        certificateUrl: certificatePath,
      })
      .onConflictDoUpdate({
        target: [courseCertificates.courseId, courseCertificates.userId],
        set: { issuedAt: now, certificateUrl: certificatePath },
      })
      .returning({
        id: courseCertificates.id,
        issuedAt: courseCertificates.issuedAt,
        expiresAt: courseCertificates.expiresAt,
        certificateUrl: courseCertificates.certificateUrl,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.read",
      entityType: "course_certificate",
      entityId: id,
      payload: { courseId: id, title: course.title },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({
      certificate: {
        id: cert?.id,
        issuedAt: cert?.issuedAt,
        expiresAt: cert?.expiresAt,
        certificateUrl: cert?.certificateUrl,
      },
    })
  }
)
