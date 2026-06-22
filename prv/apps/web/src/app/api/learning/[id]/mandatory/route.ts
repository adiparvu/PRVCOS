import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function courseId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const idx = parts.indexOf("mandatory")
  return idx > 0 ? (parts[idx - 1] ?? "") : ""
}

export const GET = withGates(
  { action: "learning.manage", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseMandatoryAssignments, learningCourses, users } = await import("@prv/db/schema")
    const { and, eq, isNull } = await import("drizzle-orm")

    const id = courseId(req)
    const { companyId } = ctx.session

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

    const assignments = await db
      .select({
        id: courseMandatoryAssignments.id,
        targetRole: courseMandatoryAssignments.targetRole,
        userId: courseMandatoryAssignments.userId,
        dueDate: courseMandatoryAssignments.dueDate,
        createdAt: courseMandatoryAssignments.createdAt,
        assignedByFirstName: users.firstName,
        assignedByLastName: users.lastName,
      })
      .from(courseMandatoryAssignments)
      .leftJoin(users, eq(courseMandatoryAssignments.assignedBy, users.id))
      .where(
        and(
          eq(courseMandatoryAssignments.courseId, id),
          eq(courseMandatoryAssignments.companyId, companyId)
        )
      )

    return NextResponse.json({
      assignments: assignments.map((a) => ({
        id: a.id,
        targetRole: a.targetRole,
        userId: a.userId,
        dueDate: a.dueDate,
        createdAt: a.createdAt,
        assignedBy: a.assignedByFirstName
          ? `${a.assignedByFirstName} ${a.assignedByLastName ?? ""}`.trim()
          : null,
      })),
    })
  }
)

const assignSchema = z
  .object({
    targetRole: z.string().min(1).max(255).optional(),
    userId: z.string().uuid().optional(),
    dueDate: z.string().datetime().optional(),
  })
  .refine((d) => d.targetRole || d.userId, {
    message: "One of targetRole or userId is required",
  })

export const POST = withGates(
  { action: "learning.manage", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseMandatoryAssignments, learningCourses } = await import("@prv/db/schema")
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

    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [record] = await db
      .insert(courseMandatoryAssignments)
      .values({
        courseId: id,
        companyId,
        targetRole: parsed.data.targetRole ?? null,
        userId: parsed.data.userId ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        assignedBy: userId,
      })
      .returning({ id: courseMandatoryAssignments.id })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.manage",
      entityType: "course_mandatory_assignment",
      entityId: record.id,
      payload: { courseId: id, ...parsed.data },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id }, { status: 201 })
  }
)
