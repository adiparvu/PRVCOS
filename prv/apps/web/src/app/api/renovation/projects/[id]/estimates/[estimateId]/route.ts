import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import {
  renovationEstimates,
  renovationEstimateLines,
  renovationProjects,
  users,
} from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", estimateId: parts.at(-1) ?? "" }
}

async function resolveEstimate(projectId: string, estimateId: string, companyId: string) {
  const [project] = await db
    .select({ id: renovationProjects.id })
    .from(renovationProjects)
    .where(
      and(
        eq(renovationProjects.id, projectId),
        eq(renovationProjects.companyId, companyId),
        isNull(renovationProjects.deletedAt)
      )
    )
    .limit(1)
  if (!project) return null

  const [estimate] = await db
    .select()
    .from(renovationEstimates)
    .where(
      and(
        eq(renovationEstimates.id, estimateId),
        eq(renovationEstimates.projectId, projectId),
        isNull(renovationEstimates.deletedAt)
      )
    )
    .limit(1)

  return estimate ?? null
}

// ── GET /api/renovation/projects/[id]/estimates/[estimateId] ─────────────────

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, estimateId } = ids(req)
    const { companyId } = ctx.session

    const estimate = await resolveEstimate(projectId, estimateId, companyId)
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [lines, preparer] = await Promise.all([
      db
        .select()
        .from(renovationEstimateLines)
        .where(eq(renovationEstimateLines.estimateId, estimateId))
        .orderBy(asc(renovationEstimateLines.lineNumber)),

      estimate.preparedBy
        ? db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, estimate.preparedBy))
            .limit(1)
        : Promise.resolve([] as { firstName: string; lastName: string }[]),
    ])

    return NextResponse.json({
      estimate: {
        ...estimate,
        subtotal: Number(estimate.subtotal),
        discount: Number(estimate.discount),
        vatRate: Number(estimate.vatRate),
        vatAmount: Number(estimate.vatAmount),
        total: Number(estimate.total),
        preparedByName: preparer[0]
          ? `${preparer[0].firstName} ${preparer[0].lastName}`
          : null,
        lines: lines.map((l) => ({
          ...l,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          totalPrice: Number(l.totalPrice),
        })),
      },
    })
  }
)

// ── PATCH /api/renovation/projects/[id]/estimates/[estimateId] ───────────────

const lineSchema = z.object({
  lineNumber: z.number().int().positive(),
  category: z.enum(["labor", "materials", "subcontractors", "equipment", "overhead"]).optional(),
  description: z.string().min(1),
  unit: z.string().max(50).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  supplierId: z.string().uuid().nullable().optional(),
})

const patchSchema = z.object({
  status: z.enum(["draft", "sent_to_client", "accepted", "rejected", "superseded"]).optional(),
  validUntil: z.string().nullable().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().nullable().optional(),
  preparedBy: z.string().uuid().nullable().optional(),
  clientResponse: z.string().nullable().optional(),
  lines: z.array(lineSchema).optional(),
})

export const PATCH = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, estimateId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const estimate = await resolveEstimate(projectId, estimateId, companyId)
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (estimate.status === "accepted")
      return NextResponse.json(
        { error: "Cannot modify an accepted estimate" },
        { status: 409 }
      )

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })

    const { lines, vatRate, ...rest } = parsed.data

    await db
      .update(renovationEstimates)
      .set({
        ...rest,
        ...(vatRate !== undefined ? { vatRate: String(vatRate) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(renovationEstimates.id, estimateId))

    // Replace lines if provided
    if (lines !== undefined) {
      await db
        .delete(renovationEstimateLines)
        .where(eq(renovationEstimateLines.estimateId, estimateId))

      if (lines.length > 0) {
        let subtotal = 0
        const lineValues = lines.map((l) => {
          const qty = l.quantity ?? 1
          const up = l.unitPrice ?? 0
          const total = qty * up
          subtotal += total
          return {
            estimateId,
            lineNumber: l.lineNumber,
            category: l.category ?? ("labor" as const),
            description: l.description,
            unit: l.unit,
            quantity: String(qty),
            unitPrice: String(up),
            totalPrice: String(total),
            supplierId: l.supplierId ?? null,
          }
        })
        await db.insert(renovationEstimateLines).values(lineValues)

        const effectiveVat = vatRate ?? Number(estimate.vatRate)
        const vatAmount = subtotal * (effectiveVat / 100)
        const discount = Number(estimate.discount)
        await db
          .update(renovationEstimates)
          .set({
            subtotal: String(subtotal),
            vatAmount: String(vatAmount),
            total: String(subtotal - discount + vatAmount),
            updatedAt: new Date(),
          })
          .where(eq(renovationEstimates.id, estimateId))
      }
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.estimates.update",
      entityType: "renovation_estimate",
      entityId: estimateId,
      payload: { ...rest, linesReplaced: lines !== undefined },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: estimateId })
  }
)

// ── DELETE /api/renovation/projects/[id]/estimates/[estimateId] ──────────────
// Soft-delete. Only allowed when status is "draft" or "rejected".

export const DELETE = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, estimateId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const estimate = await resolveEstimate(projectId, estimateId, companyId)
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!["draft", "rejected"].includes(estimate.status))
      return NextResponse.json(
        { error: `Cannot delete estimate with status "${estimate.status}"` },
        { status: 409 }
      )

    await db
      .update(renovationEstimates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(renovationEstimates.id, estimateId))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.estimates.delete",
      entityType: "renovation_estimate",
      entityId: estimateId,
      payload: { estimateNumber: estimate.estimateNumber },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
