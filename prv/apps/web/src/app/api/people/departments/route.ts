import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { departments } from "@prv/db/schema"
import { and, asc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  parentId: z.string().uuid().optional(),
  headUserId: z.string().uuid().optional(),
})

export const GET = withGates(
  { action: "hr.departments.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const rows = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        parentId: departments.parentId,
        headUserId: departments.headUserId,
        isActive: departments.isActive,
        createdAt: departments.createdAt,
      })
      .from(departments)
      .where(and(eq(departments.companyId, companyId), eq(departments.isActive, true)))
      .orderBy(asc(departments.name))

    return NextResponse.json({ departments: rows, count: rows.length })
  }
)

export const POST = withGates(
  { action: "hr.departments.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 422 })

    const { name, code, parentId, headUserId } = parsed.data

    if (parentId) {
      const [parent] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.id, parentId), eq(departments.companyId, companyId), eq(departments.isActive, true)))
        .limit(1)
      if (!parent) return NextResponse.json({ error: "Parent department not found" }, { status: 404 })
    }

    const [row] = await db
      .insert(departments)
      .values({ companyId, name, code, parentId: parentId ?? null, headUserId: headUserId ?? null })
      .returning({ id: departments.id, name: departments.name, code: departments.code })

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "hr.department.create",
      entityType: "department",
      entityId: row!.id,
      payload: { name, code, parentId: parentId ?? null },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(row, { status: 201 })
  }
)
