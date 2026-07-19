import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyInspections, inspectionItemResults, projectTasks } from "@prv/db/schema"
import { and, asc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import {
  computeInspectionScore,
  missingRequiredPhotos,
  type ChecklistResult,
} from "@/lib/inspection-checklist"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function inspectionId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  return parts[parts.indexOf("inspections") + 1] ?? ""
}

async function loadInspection(id: string, companyId: string) {
  const [row] = await db
    .select({
      id: safetyInspections.id,
      title: safetyInspections.title,
      projectId: safetyInspections.projectId,
      status: safetyInspections.status,
    })
    .from(safetyInspections)
    .where(and(eq(safetyInspections.id, id), eq(safetyInspections.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// ─── GET .../checklist — the executed item results for this inspection ─────────
export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = inspectionId(req)
    if (!(await loadInspection(id, companyId)))
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rows = await db
      .select()
      .from(inspectionItemResults)
      .where(eq(inspectionItemResults.inspectionId, id))
      .orderBy(asc(inspectionItemResults.itemIndex))

    return NextResponse.json({
      items: rows.map((r) => ({
        itemIndex: r.itemIndex,
        label: r.label,
        weight: r.weight,
        critical: r.critical,
        result: r.result as ChecklistResult,
        note: r.note,
        photoUrl: r.photoUrl,
        correctiveTaskId: r.correctiveTaskId,
      })),
    })
  }
)

// ─── POST .../checklist — submit answers, score, spawn corrective tasks ────────
const itemSchema = z.object({
  label: z.string().min(1).max(500),
  weight: z.number().int().min(1).max(100).default(1),
  critical: z.boolean().default(false),
  requirePhoto: z.boolean().default(false),
  result: z.enum(["pass", "fail", "na"]),
  note: z.string().max(1000).nullable().optional(),
  photoUrl: z.string().max(2000).nullable().optional(),
})
const bodySchema = z.object({ items: z.array(itemSchema).min(1).max(200) })

export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = inspectionId(req)

    const inspection = await loadInspection(id, companyId)
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const items = parsed.data.items

    // A failed item that mandates a photo must carry one before we can complete.
    const missing = missingRequiredPhotos(
      items.map((i) => ({
        requirePhoto: i.requirePhoto,
        result: i.result,
        photoUrl: i.photoUrl ?? null,
        label: i.label,
      }))
    )
    if (missing.length > 0)
      return NextResponse.json(
        { error: "Photo required for failed items", items: missing },
        { status: 422 }
      )

    const score = computeInspectionScore(
      items.map((i) => ({ weight: i.weight, critical: i.critical, result: i.result }))
    )

    // Corrective tasks for failed items, when the inspection is tied to a project.
    let orderIndex = 0
    if (inspection.projectId) {
      const [maxRow] = await db
        .select({ max: sql<number>`COALESCE(MAX(${projectTasks.orderIndex}), 0)::int` })
        .from(projectTasks)
        .where(
          and(
            eq(projectTasks.projectId, inspection.projectId),
            eq(projectTasks.companyId, companyId),
            eq(projectTasks.status, "backlog")
          )
        )
      orderIndex = maxRow?.max ?? 0
    }

    // Replace prior results with this submission.
    await db.delete(inspectionItemResults).where(eq(inspectionItemResults.inspectionId, id))

    let correctiveCreated = 0
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx]!
      let correctiveTaskId: string | null = null
      if (it.result === "fail" && inspection.projectId) {
        orderIndex += 1
        const [task] = await db
          .insert(projectTasks)
          .values({
            companyId,
            projectId: inspection.projectId,
            title: `Corectiv: ${it.label}`.slice(0, 255),
            description: `Neconformitate la inspecția „${inspection.title}'${it.note ? ` — ${it.note}` : ""}`,
            priority: it.critical ? "high" : "medium",
            status: "backlog",
            orderIndex,
            assignedById: userId,
          })
          .returning({ id: projectTasks.id })
        correctiveTaskId = task?.id ?? null
        if (correctiveTaskId) correctiveCreated++
      }
      await db.insert(inspectionItemResults).values({
        companyId,
        inspectionId: id,
        itemIndex: idx,
        label: it.label,
        weight: it.weight,
        critical: it.critical,
        result: it.result,
        note: it.note ?? null,
        photoUrl: it.photoUrl ?? null,
        correctiveTaskId,
      })
    }

    await db
      .update(safetyInspections)
      .set({
        score: score.score,
        maxScore: score.maxScore,
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(safetyInspections.id, id), eq(safetyInspections.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.inspection.checklist_submit",
      entityType: "safety_inspection",
      entityId: id,
      payload: {
        items: items.length,
        passRate: score.passRate,
        failedItems: score.failedItems,
        failedCritical: score.failedCritical,
        correctiveCreated,
      },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ ...score, correctiveCreated }, { status: 201 })
  }
)
