import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { candidates } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STAGES = [
  "sourcing",
  "screening",
  "phone_screen",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
] as const

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

const patchSchema = z
  .object({
    stage: z.enum(STAGES).optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    fullName: z.string().min(1).max(160).optional(),
    email: z.string().email().max(255).nullable().optional(),
    source: z.string().max(80).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "hr.recruitment.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const patch: Record<string, unknown> = { updatedAt: new Date(), ...parsed.data }

    const [updated] = await db
      .update(candidates)
      .set(patch)
      .where(and(eq(candidates.id, rowId), eq(candidates.companyId, companyId)))
      .returning({ id: candidates.id, stage: candidates.stage })

    if (!updated) return NextResponse.json({ error: "Candidate not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.recruitment.candidate.update",
      entityType: "candidate",
      entityId: rowId,
      payload: { ...parsed.data },
      method: "PATCH",
      path: `/api/recruitment/candidates/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, stage: updated.stage })
  }
)

export const DELETE = withGates(
  { action: "hr.recruitment.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const deleted = await db
      .delete(candidates)
      .where(and(eq(candidates.id, rowId), eq(candidates.companyId, companyId)))
      .returning({ id: candidates.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.recruitment.candidate.delete",
      entityType: "candidate",
      entityId: rowId,
      payload: { id: rowId },
      method: "DELETE",
      path: `/api/recruitment/candidates/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
