import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyInspections, users } from "@prv/db/schema"
import { and, count, eq, lt, ne, asc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export type InspectionStatus = "scheduled" | "in_progress" | "completed" | "overdue"

export interface InspectionSummary {
  id: string
  title: string
  status: InspectionStatus
  scheduledAt: string
  completedAt: string | null
  score: number | null
  maxScore: number | null
  assignedTo: string | null
  projectId: string | null
}

export interface InspectionsMeta {
  total: number
  scheduled: number
  inProgress: number
  completed: number
  overdue: number
}

const LIMIT = 50

// ── GET /api/safety/inspections ───────────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const statusFilter = req.nextUrl.searchParams.get("status") as InspectionStatus | null
    const limitParam = req.nextUrl.searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || LIMIT, 200) : LIMIT

    const now = new Date()

    const rows = await db
      .select({
        id: safetyInspections.id,
        title: safetyInspections.title,
        status: safetyInspections.status,
        scheduledAt: safetyInspections.scheduledAt,
        completedAt: safetyInspections.completedAt,
        score: safetyInspections.score,
        maxScore: safetyInspections.maxScore,
        assignedTo: safetyInspections.assignedTo,
        projectId: safetyInspections.projectId,
      })
      .from(safetyInspections)
      .where(
        and(
          eq(safetyInspections.companyId, companyId),
          statusFilter ? eq(safetyInspections.status, statusFilter) : undefined
        )
      )
      .orderBy(asc(safetyInspections.scheduledAt))
      .limit(limit)

    const [totalRow, scheduledRow, inProgressRow, completedRow, overdueRow] = await Promise.all([
      db
        .select({ value: count() })
        .from(safetyInspections)
        .where(eq(safetyInspections.companyId, companyId)),
      db
        .select({ value: count() })
        .from(safetyInspections)
        .where(
          and(eq(safetyInspections.companyId, companyId), eq(safetyInspections.status, "scheduled"))
        ),
      db
        .select({ value: count() })
        .from(safetyInspections)
        .where(
          and(
            eq(safetyInspections.companyId, companyId),
            eq(safetyInspections.status, "in_progress")
          )
        ),
      db
        .select({ value: count() })
        .from(safetyInspections)
        .where(
          and(eq(safetyInspections.companyId, companyId), eq(safetyInspections.status, "completed"))
        ),
      // overdue: scheduledAt < now AND status != completed
      db
        .select({ value: count() })
        .from(safetyInspections)
        .where(
          and(
            eq(safetyInspections.companyId, companyId),
            lt(safetyInspections.scheduledAt, now),
            ne(safetyInspections.status, "completed")
          )
        ),
    ])

    const inspections: InspectionSummary[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as InspectionStatus,
      scheduledAt: r.scheduledAt.toISOString(),
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      score: r.score ?? null,
      maxScore: r.maxScore ?? null,
      assignedTo: r.assignedTo ?? null,
      projectId: r.projectId ?? null,
    }))

    const meta: InspectionsMeta = {
      total: totalRow[0]?.value ?? 0,
      scheduled: scheduledRow[0]?.value ?? 0,
      inProgress: inProgressRow[0]?.value ?? 0,
      completed: completedRow[0]?.value ?? 0,
      overdue: overdueRow[0]?.value ?? 0,
    }

    return NextResponse.json({ inspections, meta })
  }
)

// ── POST /api/safety/inspections ──────────────────────────────────────────────

const createInspectionSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  scheduledAt: z.string().datetime(),
  projectId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  recurrenceWeeks: z.number().int().positive().optional(),
})

export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createInspectionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const d = parsed.data

    const [record] = await db
      .insert(safetyInspections)
      .values({
        companyId,
        createdBy: userId,
        status: "scheduled",
        title: d.title,
        description: d.description ?? null,
        scheduledAt: new Date(d.scheduledAt),
        projectId: d.projectId ?? null,
        assignedTo: d.assignedTo ?? null,
        recurrenceWeeks: d.recurrenceWeeks ?? null,
      })
      .returning({ id: safetyInspections.id, title: safetyInspections.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.inspection.create",
      entityType: "safety_inspection",
      entityId: record.id,
      payload: d,
      method: "POST",
      path: "/api/safety/inspections",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
  }
)
