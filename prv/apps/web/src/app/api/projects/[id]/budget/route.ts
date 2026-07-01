import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectMilestones, projectBudgetLines } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { computeEva, type EvaResult } from "@/lib/eva"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CATEGORIES = ["labor", "materials", "equipment", "overhead", "contingency"] as const
type Category = (typeof CATEGORIES)[number]

export interface BudgetLine {
  category: Category
  plannedAmount: number
  committedAmount: number
  actualAmount: number
  notes: string | null
}

export interface BudgetResponse {
  lines: BudgetLine[]
  totals: { planned: number; committed: number; actual: number }
  eva: EvaResult
  progress: { percentComplete: number; scheduleFraction: number; elapsedWeeks: number }
}

function pid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}
function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const DAY = 86_400_000

async function verifyProject(id: string, companyId: string) {
  const [row] = await db
    .select({
      id: projects.id,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
    })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .limit(1)
  return row ?? null
}

// GET /api/projects/[id]/budget — category breakdown + live Earned Value
// Analysis. Physical progress is derived from milestone completion; schedule
// fraction from the project's start/due window.
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const project = await verifyProject(id, ctx.session.companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const [lineRows, milestoneRows] = await Promise.all([
      db
        .select({
          category: projectBudgetLines.category,
          plannedAmount: projectBudgetLines.plannedAmount,
          committedAmount: projectBudgetLines.committedAmount,
          actualAmount: projectBudgetLines.actualAmount,
          notes: projectBudgetLines.notes,
        })
        .from(projectBudgetLines)
        .where(eq(projectBudgetLines.projectId, id)),
      db
        .select({ isComplete: projectMilestones.isComplete })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, id)),
    ])

    const lines: BudgetLine[] = lineRows.map((r) => ({
      category: r.category as Category,
      plannedAmount: num(r.plannedAmount),
      committedAmount: num(r.committedAmount),
      actualAmount: num(r.actualAmount),
      notes: r.notes,
    }))

    const totals = lines.reduce(
      (acc, l) => ({
        planned: acc.planned + l.plannedAmount,
        committed: acc.committed + l.committedAmount,
        actual: acc.actual + l.actualAmount,
      }),
      { planned: 0, committed: 0, actual: 0 }
    )

    // Physical progress from milestone completion.
    const percentComplete = milestoneRows.length
      ? milestoneRows.filter((m) => m.isComplete).length / milestoneRows.length
      : 0

    // Schedule fraction + elapsed weeks from the project window.
    const now = Date.now()
    let scheduleFraction = 0
    let elapsedWeeks = 0
    if (project.startDate) {
      const start = new Date(project.startDate + "T00:00:00Z").getTime()
      elapsedWeeks = Math.max(0, (now - start) / (7 * DAY))
      if (project.dueDate) {
        const due = new Date(project.dueDate + "T00:00:00Z").getTime()
        if (due > start) scheduleFraction = (now - start) / (due - start)
      }
    }

    const eva = computeEva({
      bac: totals.planned,
      ac: totals.actual,
      committed: totals.committed,
      percentComplete,
      scheduleFraction,
      elapsedWeeks,
    })

    const body: BudgetResponse = {
      lines,
      totals,
      eva,
      progress: {
        percentComplete: Math.round(percentComplete * 100) / 100,
        scheduleFraction: Math.round(Math.max(0, Math.min(1, scheduleFraction)) * 100) / 100,
        elapsedWeeks: Math.round(elapsedWeeks * 10) / 10,
      },
    }
    return NextResponse.json(body)
  }
)

// POST /api/projects/[id]/budget — upsert one category line.
const postSchema = z.object({
  category: z.enum(CATEGORIES),
  plannedAmount: z.number().min(0).optional(),
  committedAmount: z.number().min(0).optional(),
  actualAmount: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(id, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const planned = (d.plannedAmount ?? 0).toFixed(2)
    const committed = (d.committedAmount ?? 0).toFixed(2)
    const actual = (d.actualAmount ?? 0).toFixed(2)

    const [record] = await db
      .insert(projectBudgetLines)
      .values({
        companyId,
        projectId: id,
        category: d.category,
        plannedAmount: planned,
        committedAmount: committed,
        actualAmount: actual,
        notes: d.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [projectBudgetLines.projectId, projectBudgetLines.category],
        set: {
          plannedAmount: planned,
          committedAmount: committed,
          actualAmount: actual,
          notes: d.notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: projectBudgetLines.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.budget.upsert",
      entityType: "project",
      entityId: id,
      payload: { category: d.category },
      method: "POST",
      path: `/api/projects/${id}/budget`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)

// DELETE /api/projects/[id]/budget?category= — remove one category line.
export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const category = req.nextUrl.searchParams.get("category")
    if (!category || !CATEGORIES.includes(category as Category)) {
      return NextResponse.json({ error: "Valid category is required" }, { status: 400 })
    }

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(id, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const deleted = await db
      .delete(projectBudgetLines)
      .where(
        and(
          eq(projectBudgetLines.projectId, id),
          eq(projectBudgetLines.companyId, companyId),
          eq(projectBudgetLines.category, category as Category)
        )
      )
      .returning({ id: projectBudgetLines.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Budget line not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.budget.remove",
      entityType: "project",
      entityId: id,
      payload: { category },
      method: "DELETE",
      path: `/api/projects/${id}/budget`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
