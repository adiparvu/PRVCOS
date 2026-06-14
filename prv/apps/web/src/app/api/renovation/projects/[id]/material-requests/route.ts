import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import {
  renovationMaterialRequests,
  renovationMaterialRequestLines,
  renovationProjects,
  users,
} from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function projectId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-3) ?? ""
}

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const pid = projectId(req)

    const [ownerCheck] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, pid),
          eq(renovationProjects.companyId, ctx.session.companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)

    if (!ownerCheck) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const requests = await db
      .select({
        id: renovationMaterialRequests.id,
        status: renovationMaterialRequests.status,
        neededByDate: renovationMaterialRequests.neededByDate,
        notes: renovationMaterialRequests.notes,
        phaseId: renovationMaterialRequests.phaseId,
        requestedBy: renovationMaterialRequests.requestedBy,
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
        createdAt: renovationMaterialRequests.createdAt,
        updatedAt: renovationMaterialRequests.updatedAt,
      })
      .from(renovationMaterialRequests)
      .leftJoin(users, eq(renovationMaterialRequests.requestedBy, users.id))
      .where(
        and(
          eq(renovationMaterialRequests.projectId, pid),
          isNull(renovationMaterialRequests.deletedAt)
        )
      )
      .orderBy(desc(renovationMaterialRequests.createdAt))

    const includeLines = new URL(req.url).searchParams.get("lines") === "true"
    let linesByRequest: Record<string, typeof lines> = {}

    if (includeLines && requests.length > 0) {
      const requestIds = requests.map((r) => r.id)
      const allLines = await Promise.all(
        requestIds.map((id) =>
          db
            .select()
            .from(renovationMaterialRequestLines)
            .where(eq(renovationMaterialRequestLines.requestId, id))
        )
      )
      requestIds.forEach((id, i) => {
        linesByRequest[id] = allLines[i] ?? []
      })
    }

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        status: r.status,
        neededByDate: r.neededByDate,
        notes: r.notes,
        phaseId: r.phaseId,
        requestedBy: r.requestedBy,
        requesterName:
          r.requesterFirstName && r.requesterLastName
            ? `${r.requesterFirstName} ${r.requesterLastName}`
            : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        ...(includeLines
          ? {
              lines: (linesByRequest[r.id] ?? []).map((l) => ({
                id: l.id,
                description: l.description,
                unit: l.unit,
                quantityRequested: Number(l.quantityRequested),
                quantityApproved: l.quantityApproved ? Number(l.quantityApproved) : null,
                estimatedUnitPrice: l.estimatedUnitPrice ? Number(l.estimatedUnitPrice) : null,
                supplierId: l.supplierId,
              })),
            }
          : {}),
      })),
    })
  }
)

const lineSchema = z.object({
  description: z.string().min(1),
  unit: z.string().max(50).optional(),
  quantityRequested: z.number().positive(),
  estimatedUnitPrice: z.number().nonnegative().optional(),
  supplierId: z.string().uuid().optional(),
})

const createSchema = z.object({
  phaseId: z.string().uuid().optional(),
  neededByDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})

export const POST = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const pid = projectId(req)
    const { companyId, userId, sessionId } = ctx.session

    const [ownerCheck] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, pid),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)

    if (!ownerCheck) return NextResponse.json({ error: "Project not found" }, { status: 404 })

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

    const { lines, ...rest } = parsed.data

    const [request] = await db
      .insert(renovationMaterialRequests)
      .values({
        projectId: pid,
        requestedBy: userId,
        ...rest,
      })
      .returning({ id: renovationMaterialRequests.id })

    if (!request) return NextResponse.json({ error: "Failed to create request" }, { status: 500 })

    await db.insert(renovationMaterialRequestLines).values(
      lines.map((line) => ({
        requestId: request.id,
        description: line.description,
        unit: line.unit ?? null,
        quantityRequested: String(line.quantityRequested),
        estimatedUnitPrice:
          line.estimatedUnitPrice !== undefined ? String(line.estimatedUnitPrice) : null,
        supplierId: line.supplierId ?? null,
      }))
    )

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.material_request.create",
      entityType: "renovation_material_request",
      entityId: request.id,
      payload: parsed.data,
      method: "POST",
      path: `/api/renovation/projects/${pid}/material-requests`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: request.id }, { status: 201 })
  }
)
