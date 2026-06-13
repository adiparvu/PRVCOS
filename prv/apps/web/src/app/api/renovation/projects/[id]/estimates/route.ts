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
import { and, asc, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function projectId(req: NextRequest) {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = projectId(req)
    const { companyId } = ctx.session
    const includeLines = req.nextUrl.searchParams.get("lines") === "true"

    const [project] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const estimates = await db
      .select({
        id: renovationEstimates.id,
        estimateNumber: renovationEstimates.estimateNumber,
        version: renovationEstimates.version,
        status: renovationEstimates.status,
        validUntil: renovationEstimates.validUntil,
        subtotal: renovationEstimates.subtotal,
        discount: renovationEstimates.discount,
        vatRate: renovationEstimates.vatRate,
        vatAmount: renovationEstimates.vatAmount,
        total: renovationEstimates.total,
        currency: renovationEstimates.currency,
        notes: renovationEstimates.notes,
        preparedBy: renovationEstimates.preparedBy,
        preparedByFirst: users.firstName,
        preparedByLast: users.lastName,
        clientViewedAt: renovationEstimates.clientViewedAt,
        clientResponse: renovationEstimates.clientResponse,
        createdAt: renovationEstimates.createdAt,
      })
      .from(renovationEstimates)
      .leftJoin(users, eq(renovationEstimates.preparedBy, users.id))
      .where(and(eq(renovationEstimates.projectId, id), isNull(renovationEstimates.deletedAt)))
      .orderBy(desc(renovationEstimates.createdAt))

    const result = estimates.map((e) => ({
      ...e,
      subtotal: Number(e.subtotal),
      discount: Number(e.discount),
      vatRate: Number(e.vatRate),
      vatAmount: Number(e.vatAmount),
      total: Number(e.total),
      preparedByName:
        e.preparedByFirst && e.preparedByLast ? `${e.preparedByFirst} ${e.preparedByLast}` : null,
      preparedByFirst: undefined,
      preparedByLast: undefined,
    }))

    if (!includeLines) return NextResponse.json({ estimates: result })

    const estimateIds = estimates.map((e) => e.id)
    const lines =
      estimateIds.length > 0
        ? await db
            .select()
            .from(renovationEstimateLines)
            .where(
              estimateIds.length === 1
                ? eq(renovationEstimateLines.estimateId, estimateIds[0]!)
                : renovationEstimateLines.estimateId.in(estimateIds)
            )
            .orderBy(
              asc(renovationEstimateLines.estimateId),
              asc(renovationEstimateLines.lineNumber)
            )
        : []

    const linesByEstimate = lines.reduce<Record<string, typeof lines>>((acc, l) => {
      const key = l.estimateId
      ;(acc[key] ??= []).push(l)
      return acc
    }, {})

    return NextResponse.json({
      estimates: result.map((e) => ({
        ...e,
        lines: (linesByEstimate[e.id] ?? []).map((l) => ({
          ...l,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          totalPrice: Number(l.totalPrice),
        })),
      })),
    })
  }
)

const lineSchema = z.object({
  lineNumber: z.number().int().positive(),
  category: z.enum(["labor", "materials", "subcontractors", "equipment", "overhead"]).optional(),
  description: z.string().min(1),
  unit: z.string().max(50).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().nonnegative().optional(),
  supplierId: z.string().uuid().nullable().optional(),
})

const createSchema = z.object({
  estimateNumber: z.string().min(1).max(50),
  version: z.number().int().positive().optional(),
  status: z.enum(["draft", "sent_to_client", "accepted", "rejected", "superseded"]).optional(),
  validUntil: z.string().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  preparedBy: z.string().uuid().nullable().optional(),
  lines: z.array(lineSchema).optional(),
})

export const POST = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = projectId(req)
    const { companyId, userId } = ctx.session

    const [project] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { lines, vatRate, ...rest } = parsed.data

    const [estimate] = await db
      .insert(renovationEstimates)
      .values({
        projectId: id,
        ...rest,
        ...(vatRate !== undefined ? { vatRate: String(vatRate) } : {}),
      })
      .returning({ id: renovationEstimates.id, estimateNumber: renovationEstimates.estimateNumber })

    if (lines && lines.length > 0) {
      let subtotal = 0
      const lineValues = lines.map((l) => {
        const qty = l.quantity ?? 1
        const up = l.unitPrice ?? 0
        const total = qty * up
        subtotal += total
        return {
          estimateId: estimate!.id,
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

      const vatRateNum = vatRate ?? 19
      const vatAmount = subtotal * (vatRateNum / 100)
      await db
        .update(renovationEstimates)
        .set({
          subtotal: String(subtotal),
          vatAmount: String(vatAmount),
          total: String(subtotal + vatAmount),
          updatedAt: new Date(),
        })
        .where(eq(renovationEstimates.id, estimate!.id))
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.estimates.create",
      entityType: "renovation_estimate",
      entityId: estimate!.id,
      payload: { ...rest, lineCount: lines?.length ?? 0 },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(estimate, { status: 201 })
  }
)
