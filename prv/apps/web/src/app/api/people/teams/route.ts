import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { teams, departments, stores } from "@prv/db/schema"
import { and, asc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const createSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  departmentId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  leadUserId: z.string().uuid().optional(),
})

export const GET = withGates(
  { action: "hr.teams.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const { searchParams } = new URL(req.url)
    const departmentId = searchParams.get("departmentId")
    const storeId = searchParams.get("storeId")

    const conditions = [eq(teams.companyId, companyId), eq(teams.isActive, true)]
    if (departmentId) conditions.push(eq(teams.departmentId, departmentId))
    if (storeId) conditions.push(eq(teams.storeId, storeId))

    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        code: teams.code,
        departmentId: teams.departmentId,
        departmentName: departments.name,
        storeId: teams.storeId,
        storeName: stores.name,
        leadUserId: teams.leadUserId,
        isActive: teams.isActive,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .leftJoin(departments, eq(teams.departmentId, departments.id))
      .leftJoin(stores, eq(teams.storeId, stores.id))
      .where(and(...conditions))
      .orderBy(asc(teams.name))

    return NextResponse.json({ teams: rows, count: rows.length })
  }
)

export const POST = withGates(
  { action: "hr.teams.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { userId, companyId, sessionId } = ctx.session

    const raw = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 422 })

    const { name, code, departmentId, storeId, leadUserId } = parsed.data

    const [row] = await db
      .insert(teams)
      .values({
        companyId,
        name,
        code,
        departmentId: departmentId ?? null,
        storeId: storeId ?? null,
        leadUserId: leadUserId ?? null,
      })
      .returning({ id: teams.id, name: teams.name, code: teams.code })

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "hr.team.create",
      entityType: "team",
      entityId: row!.id,
      payload: { name, code, departmentId: departmentId ?? null, storeId: storeId ?? null },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(row, { status: 201 })
  }
)
