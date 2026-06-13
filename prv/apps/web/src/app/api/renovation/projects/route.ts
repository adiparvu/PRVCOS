import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationProjects, clients, users } from "@prv/db/schema"
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)

    const conditions = [
      eq(renovationProjects.companyId, ctx.session.companyId),
      isNull(renovationProjects.deletedAt),
    ]
    if (status) {
      conditions.push(
        eq(renovationProjects.status, status as typeof renovationProjects.status._.data)
      )
    }
    if (cursor) conditions.push(lt(renovationProjects.createdAt, new Date(cursor)))

    const rows = await db
      .select({
        id: renovationProjects.id,
        projectCode: renovationProjects.projectCode,
        title: renovationProjects.title,
        status: renovationProjects.status,
        priority: renovationProjects.priority,
        projectType: renovationProjects.projectType,
        estimatedValue: renovationProjects.estimatedValue,
        contractedValue: renovationProjects.contractedValue,
        currency: renovationProjects.currency,
        completionPercentage: renovationProjects.completionPercentage,
        estimatedStartDate: renovationProjects.estimatedStartDate,
        estimatedEndDate: renovationProjects.estimatedEndDate,
        city: renovationProjects.city,
        clientId: renovationProjects.clientId,
        clientName: clients.name,
        projectManagerId: renovationProjects.projectManagerId,
        managerFirstName: users.firstName,
        managerLastName: users.lastName,
        createdAt: renovationProjects.createdAt,
      })
      .from(renovationProjects)
      .leftJoin(clients, eq(renovationProjects.clientId, clients.id))
      .leftJoin(users, eq(renovationProjects.projectManagerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(renovationProjects.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const projects = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && projects.length > 0 ? projects[projects.length - 1]!.createdAt.toISOString() : null

    const data = projects.map((r) => ({
      id: r.id,
      projectCode: r.projectCode,
      title: r.title,
      status: r.status,
      priority: r.priority,
      projectType: r.projectType,
      estimatedValue: r.estimatedValue ? Number(r.estimatedValue) : null,
      contractedValue: r.contractedValue ? Number(r.contractedValue) : null,
      currency: r.currency,
      completionPercentage: r.completionPercentage,
      estimatedStartDate: r.estimatedStartDate,
      estimatedEndDate: r.estimatedEndDate,
      city: r.city,
      clientId: r.clientId,
      clientName: r.clientName ?? null,
      projectManagerId: r.projectManagerId,
      projectManagerName:
        r.managerFirstName && r.managerLastName
          ? `${r.managerFirstName} ${r.managerLastName}`
          : null,
    }))

    return NextResponse.json({ projects: data, count: data.length, nextCursor })
  }
)

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  projectCode: z.string().max(50).optional(),
  status: z
    .enum([
      "inquiry",
      "estimation",
      "contracted",
      "in_progress",
      "paused",
      "completed",
      "cancelled",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectType: z.enum(["residential", "commercial", "industrial", "public"]).optional(),
  clientId: z.string().uuid().nullable().optional(),
  projectManagerId: z.string().uuid().nullable().optional(),
  siteSupervisorId: z.string().uuid().nullable().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  coordinates: z.record(z.unknown()).optional(),
  estimatedStartDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  estimatedValue: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  tags: z.array(z.string()).optional(),
})

export const POST = withGates(
  { action: "renovation.projects.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { estimatedValue, ...rest } = parsed.data
    const [record] = await db
      .insert(renovationProjects)
      .values({
        companyId,
        ...rest,
        ...(estimatedValue !== undefined ? { estimatedValue: String(estimatedValue) } : {}),
      })
      .returning({ id: renovationProjects.id, title: renovationProjects.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.projects.create",
      entityType: "renovation_project",
      entityId: record.id,
      payload: parsed.data,
      method: "POST",
      path: "/api/renovation/projects",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
  }
)
