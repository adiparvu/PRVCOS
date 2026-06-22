import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function courseId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const idx = parts.indexOf("modules")
  return idx > 0 ? (parts[idx - 1] ?? "") : ""
}

export const GET = withGates(
  { action: "learning.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseModules, learningCourses } = await import("@prv/db/schema")
    const { and, eq, isNull, asc } = await import("drizzle-orm")

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

    const modules = await db
      .select({
        id: courseModules.id,
        title: courseModules.title,
        sortOrder: courseModules.sortOrder,
        createdAt: courseModules.createdAt,
      })
      .from(courseModules)
      .where(and(eq(courseModules.courseId, id), eq(courseModules.companyId, companyId)))
      .orderBy(asc(courseModules.sortOrder))

    return NextResponse.json({ modules })
  }
)

const createModuleSchema = z.object({
  title: z.string().min(1).max(500),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const POST = withGates(
  { action: "learning.manage", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { db } = await import("@prv/db")
    const { courseModules, learningCourses } = await import("@prv/db/schema")
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

    const parsed = createModuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [record] = await db
      .insert(courseModules)
      .values({ courseId: id, companyId, ...parsed.data })
      .returning({ id: courseModules.id, title: courseModules.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "learning.manage",
      entityType: "course_module",
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
