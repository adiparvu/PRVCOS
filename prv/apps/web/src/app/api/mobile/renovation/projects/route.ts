import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import type { MobileContext } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { renovationProjects, clients, users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx: MobileContext) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const cursor = searchParams.get("cursor")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100)

  const conditions = [
    eq(renovationProjects.companyId, ctx.companyId),
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

  return NextResponse.json({
    projects: projects.map((r) => ({
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
      clientName: r.clientName ?? null,
      projectManagerName:
        r.managerFirstName && r.managerLastName
          ? `${r.managerFirstName} ${r.managerLastName}`
          : null,
    })),
    nextCursor,
  })
})

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  projectType: z.enum(["residential", "commercial", "industrial", "public"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  clientId: z.string().uuid().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  estimatedStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  estimatedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  estimatedValue: z.number().nonnegative().optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx: MobileContext) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { estimatedValue, ...rest } = parsed.data

  const [record] = await db
    .insert(renovationProjects)
    .values({
      companyId: ctx.companyId,
      projectManagerId: ctx.userId,
      ...rest,
      ...(estimatedValue !== undefined ? { estimatedValue: String(estimatedValue) } : {}),
    })
    .returning({
      id: renovationProjects.id,
      title: renovationProjects.title,
      status: renovationProjects.status,
      projectCode: renovationProjects.projectCode,
    })

  if (!record) return NextResponse.json({ error: "Failed to create project" }, { status: 500 })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.renovation.project.create",
    entityType: "renovation_project",
    entityId: record.id,
    method: "POST",
    path: "/api/mobile/renovation/projects",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
  })

  return NextResponse.json(
    { id: record.id, title: record.title, status: record.status, projectCode: record.projectCode },
    { status: 201 }
  )
})
