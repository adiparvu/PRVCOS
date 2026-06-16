import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import {
  renovationMaterialRequests,
  renovationMaterialRequestLines,
  renovationProjects,
  users,
} from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", requestId: parts.at(-1) ?? "" }
}

async function resolveRequest(projectId: string, requestId: string, companyId: string) {
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

  const [request] = await db
    .select()
    .from(renovationMaterialRequests)
    .where(
      and(
        eq(renovationMaterialRequests.id, requestId),
        eq(renovationMaterialRequests.projectId, projectId),
        isNull(renovationMaterialRequests.deletedAt)
      )
    )
    .limit(1)

  return request ?? null
}

// ── GET /api/renovation/projects/[id]/material-requests/[requestId] ──────────

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, requestId } = ids(req)
    const { companyId } = ctx.session

    const request = await resolveRequest(projectId, requestId, companyId)
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [lines, requesterRows] = await Promise.all([
      db
        .select()
        .from(renovationMaterialRequestLines)
        .where(eq(renovationMaterialRequestLines.requestId, requestId))
        .orderBy(asc(renovationMaterialRequestLines.createdAt)),

      db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, request.requestedBy))
        .limit(1),
    ])

    return NextResponse.json({
      request: {
        ...request,
        requestedByName: requesterRows[0]
          ? `${requesterRows[0].firstName} ${requesterRows[0].lastName}`
          : null,
        lines: lines.map((l) => ({
          ...l,
          quantityRequested: Number(l.quantityRequested),
          quantityApproved: l.quantityApproved !== null ? Number(l.quantityApproved) : null,
          estimatedUnitPrice:
            l.estimatedUnitPrice !== null ? Number(l.estimatedUnitPrice) : null,
        })),
      },
    })
  }
)

// ── PATCH /api/renovation/projects/[id]/material-requests/[requestId] ────────

const lineSchema = z.object({
  description: z.string().min(1),
  unit: z.string().max(50).nullable().optional(),
  quantityRequested: z.number().positive(),
  quantityApproved: z.number().nonnegative().nullable().optional(),
  estimatedUnitPrice: z.number().nonnegative().nullable().optional(),
  supplierId: z.string().uuid().nullable().optional(),
})

const patchSchema = z.object({
  status: z.enum(["pending", "approved", "ordered", "delivered", "cancelled"]).optional(),
  phaseId: z.string().uuid().nullable().optional(),
  neededByDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  purchaseOrderId: z.string().uuid().nullable().optional(),
  lines: z.array(lineSchema).optional(),
})

export const PATCH = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, requestId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const request = await resolveRequest(projectId, requestId, companyId)
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (request.status === "delivered")
      return NextResponse.json(
        { error: "Cannot modify a delivered material request" },
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
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const { lines, ...rest } = parsed.data

    await db
      .update(renovationMaterialRequests)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(renovationMaterialRequests.id, requestId))

    if (lines !== undefined) {
      await db
        .delete(renovationMaterialRequestLines)
        .where(eq(renovationMaterialRequestLines.requestId, requestId))

      if (lines.length > 0) {
        await db.insert(renovationMaterialRequestLines).values(
          lines.map((l) => ({
            requestId,
            description: l.description,
            unit: l.unit ?? null,
            quantityRequested: String(l.quantityRequested),
            quantityApproved: l.quantityApproved !== undefined && l.quantityApproved !== null
              ? String(l.quantityApproved)
              : null,
            estimatedUnitPrice:
              l.estimatedUnitPrice !== undefined && l.estimatedUnitPrice !== null
                ? String(l.estimatedUnitPrice)
                : null,
            supplierId: l.supplierId ?? null,
          }))
        )
      }
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.material_requests.update",
      entityType: "renovation_material_request",
      entityId: requestId,
      payload: { ...rest, linesReplaced: lines !== undefined },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: requestId })
  }
)

// ── DELETE /api/renovation/projects/[id]/material-requests/[requestId] ────────
// Soft-delete. Blocked when status is approved, ordered, or delivered.

export const DELETE = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, requestId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const request = await resolveRequest(projectId, requestId, companyId)
    if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!["pending", "cancelled"].includes(request.status))
      return NextResponse.json(
        { error: `Cannot delete material request with status "${request.status}"` },
        { status: 409 }
      )

    await db
      .update(renovationMaterialRequests)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(renovationMaterialRequests.id, requestId))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.material_requests.delete",
      entityType: "renovation_material_request",
      entityId: requestId,
      payload: { status: request.status },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
