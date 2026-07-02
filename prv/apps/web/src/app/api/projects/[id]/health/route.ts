import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectTasks, projectRisks, projectBudgetLines } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { computeHealth, type BudgetBand } from "@/lib/project-health"
import { scoreRisk } from "@/lib/risk"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function pid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}
function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const DAY = 86_400_000

// GET /api/projects/[id]/health — the computed 0–100 project health score,
// blending budget (spend vs plan), progress (tasks done vs schedule elapsed)
// and risk (open critical/high). Caches the score back onto the project row.
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [project] = await db
      .select({
        id: projects.id,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.companyId, ctx.session.companyId),
          isNull(projects.deletedAt)
        )
      )
      .limit(1)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const [taskRows, riskRows, budgetRows] = await Promise.all([
      db
        .select({ status: projectTasks.status })
        .from(projectTasks)
        .where(eq(projectTasks.projectId, id)),
      db
        .select({
          impact: projectRisks.impact,
          probability: projectRisks.probability,
          status: projectRisks.status,
        })
        .from(projectRisks)
        .where(eq(projectRisks.projectId, id)),
      db
        .select({
          plannedAmount: projectBudgetLines.plannedAmount,
          actualAmount: projectBudgetLines.actualAmount,
        })
        .from(projectBudgetLines)
        .where(eq(projectBudgetLines.projectId, id)),
    ])

    // Progress: done / (all excluding cancelled).
    const active = taskRows.filter((t) => t.status !== "cancelled")
    const done = active.filter((t) => t.status === "done").length
    const totalTasks = active.length
    const taskCompletion = totalTasks > 0 ? done / totalTasks : 0

    // Budget band from spend vs plan.
    const planned = budgetRows.reduce((s, r) => s + num(r.plannedAmount), 0)
    const actual = budgetRows.reduce((s, r) => s + num(r.actualAmount), 0)
    let budgetBand: BudgetBand = null
    if (planned > 0) {
      const ratio = actual / planned
      budgetBand = ratio > 1 ? "red" : ratio >= 0.9 ? "amber" : "green"
    }

    // Open critical/high risks.
    let openCriticalRisks = 0
    let openHighRisks = 0
    for (const r of riskRows) {
      if (r.status === "closed" || r.status === "accepted") continue
      const band = scoreRisk(r.impact, r.probability).band
      if (band === "critical") openCriticalRisks += 1
      else if (band === "high") openHighRisks += 1
    }

    // Schedule fraction from the project window.
    const now = Date.now()
    let scheduleFraction = 0
    if (project.startDate && project.dueDate) {
      const start = new Date(project.startDate + "T00:00:00Z").getTime()
      const due = new Date(project.dueDate + "T00:00:00Z").getTime()
      if (due > start) scheduleFraction = Math.max(0, Math.min(1, (now - start) / (due - start)))
    }
    void DAY

    const health = computeHealth({
      budgetBand,
      taskCompletion,
      totalTasks,
      scheduleFraction,
      openCriticalRisks,
      openHighRisks,
    })

    // Cache the score back onto the project (best-effort).
    void db
      .update(projects)
      .set({ healthScore: health.score, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .catch(() => {})

    return NextResponse.json({
      ...health,
      inputs: {
        taskCompletion: Math.round(taskCompletion * 100) / 100,
        totalTasks,
        doneTasks: done,
        budgetBand,
        openCriticalRisks,
        openHighRisks,
        scheduleFraction: Math.round(scheduleFraction * 100) / 100,
      },
    })
  }
)
