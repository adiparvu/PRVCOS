import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { projects } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull, count } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  clientId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(["draft", "active"]).default("draft"),
  memberIds: z.array(z.string().uuid()).optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
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

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, clientId, storeId, dueDate, status } = parsed.data

  // Generate project code (PROJ-YYYY-XXXX)
  const year = new Date().getFullYear().toString()
  const countResult = await db
    .select({ existingCount: count() })
    .from(projects)
    .where(and(eq(projects.companyId, ctx.companyId), isNull(projects.deletedAt)))
  const existingCount = countResult[0]?.existingCount ?? 0

  const seq = String(existingCount + 1).padStart(4, "0")
  const code = `PROJ-${year}-${seq}`

  const [project] = await db
    .insert(projects)
    .values({
      companyId: ctx.companyId,
      clientId: clientId ?? null,
      storeId: storeId ?? null,
      ownerId: ctx.userId,
      name,
      code,
      status,
      dueDate: dueDate ?? null,
    })
    .returning({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      code: projects.code,
    })

  if (!project) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.project.create",
    entityType: "project",
    entityId: project.id,
    method: "POST",
    path: "/api/mobile/projects",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
  })

  return NextResponse.json(
    {
      id: project.id,
      name: project.name,
      status: project.status,
      code: project.code,
    },
    { status: 201 }
  )
})
