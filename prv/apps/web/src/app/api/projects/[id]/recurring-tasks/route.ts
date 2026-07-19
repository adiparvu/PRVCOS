import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, recurringTasks } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { computeInitialRun } from "@/lib/report-schedule"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface RecurringTaskDto {
  id: string
  title: string
  description: string | null
  priority: "low" | "medium" | "high" | "critical"
  estimatedHours: string | null
  assigneeId: string | null
  frequency: "daily" | "weekly" | "monthly"
  sendHourUtc: number
  enabled: boolean
  nextRunAt: string
  lastRunAt: string | null
  createdAt: string
}

function toDto(r: typeof recurringTasks.$inferSelect): RecurringTaskDto {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    priority: r.priority,
    estimatedHours: r.estimatedHours,
    assigneeId: r.assigneeId,
    frequency: r.frequency as RecurringTaskDto["frequency"],
    sendHourUtc: r.sendHourUtc,
    enabled: r.enabled,
    nextRunAt: r.nextRunAt.toISOString(),
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function projectIdOf(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  return parts[parts.indexOf("projects") + 1] ?? ""
}

async function verifyProject(id: string, companyId: string) {
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
    .limit(1)
  return p ?? null
}

// ─── GET /api/projects/[id]/recurring-tasks ───────────────────────────────────
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const projectId = projectIdOf(req)
    if (!(await verifyProject(projectId, companyId)))
      return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const rows = await db
      .select()
      .from(recurringTasks)
      .where(and(eq(recurringTasks.projectId, projectId), eq(recurringTasks.companyId, companyId)))
      .orderBy(desc(recurringTasks.createdAt))
      .limit(100)
    return NextResponse.json({ recurring: rows.map(toDto) })
  }
)

// ─── POST /api/projects/[id]/recurring-tasks ──────────────────────────────────
const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  estimatedHours: z.number().min(0).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  sendHourUtc: z.number().int().min(0).max(23).optional(),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const projectId = projectIdOf(req)
    if (!(await verifyProject(projectId, companyId)))
      return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const d = parsed.data
    const sendHourUtc = d.sendHourUtc ?? 7
    const nextRunAt = computeInitialRun(new Date(), sendHourUtc)

    const [created] = await db
      .insert(recurringTasks)
      .values({
        companyId,
        projectId,
        createdByUserId: userId,
        title: d.title,
        description: d.description ?? null,
        priority: d.priority ?? "medium",
        estimatedHours: d.estimatedHours != null ? d.estimatedHours.toFixed(2) : null,
        assigneeId: d.assigneeId ?? null,
        frequency: d.frequency,
        sendHourUtc,
        nextRunAt,
      })
      .returning()

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.recurring_task.create",
      entityType: "recurring_task",
      entityId: created.id,
      payload: { title: created.title, frequency: created.frequency },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(toDto(created), { status: 201 })
  }
)
