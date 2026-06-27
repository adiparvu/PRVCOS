import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationContracts, renovationProjects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", contractId: parts.at(-1) ?? "" }
}

async function resolveContract(projectId: string, contractId: string, companyId: string) {
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

  const [contract] = await db
    .select()
    .from(renovationContracts)
    .where(
      and(
        eq(renovationContracts.id, contractId),
        eq(renovationContracts.projectId, projectId),
        isNull(renovationContracts.deletedAt)
      )
    )
    .limit(1)

  return contract ?? null
}

// ── GET /api/renovation/projects/[id]/contracts/[contractId] ─────────────────

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, contractId } = ids(req)
    const { companyId } = ctx.session

    const contract = await resolveContract(projectId, contractId, companyId)
    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({
      contract: { ...contract, contractValue: Number(contract.contractValue) },
    })
  }
)

// ── PATCH /api/renovation/projects/[id]/contracts/[contractId] ───────────────

const patchSchema = z.object({
  status: z.enum(["draft", "sent", "signed", "active", "completed", "terminated"]).optional(),
  contractValue: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  estimateId: z.string().uuid().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  signedByClientAt: z.string().nullable().optional(),
  signedByCompanyAt: z.string().nullable().optional(),
  terminationDate: z.string().nullable().optional(),
  terminationReason: z.string().nullable().optional(),
  paymentTerms: z.record(z.unknown()).optional(),
})

export const PATCH = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, contractId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const contract = await resolveContract(projectId, contractId, companyId)
    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (contract.status === "completed")
      return NextResponse.json({ error: "Cannot modify a completed contract" }, { status: 409 })

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

    const { contractValue, signedByClientAt, signedByCompanyAt, ...rest } = parsed.data

    const [updated] = await db
      .update(renovationContracts)
      .set({
        ...rest,
        ...(contractValue !== undefined ? { contractValue: String(contractValue) } : {}),
        ...(signedByClientAt !== undefined
          ? { signedByClientAt: signedByClientAt ? new Date(signedByClientAt) : null }
          : {}),
        ...(signedByCompanyAt !== undefined
          ? { signedByCompanyAt: signedByCompanyAt ? new Date(signedByCompanyAt) : null }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(renovationContracts.id, contractId),
          eq(renovationContracts.projectId, projectId),
          isNull(renovationContracts.deletedAt)
        )
      )
      .returning({
        id: renovationContracts.id,
        contractNumber: renovationContracts.contractNumber,
        status: renovationContracts.status,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.contracts.update",
      entityType: "renovation_contract",
      entityId: contractId,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/renovation/projects/[id]/contracts/[contractId] ──────────────
// Soft-delete. Only allowed for draft or sent contracts.

export const DELETE = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, contractId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const contract = await resolveContract(projectId, contractId, companyId)
    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (!["draft", "sent"].includes(contract.status))
      return NextResponse.json(
        { error: `Cannot delete contract with status "${contract.status}"` },
        { status: 409 }
      )

    await db
      .update(renovationContracts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(renovationContracts.id, contractId))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.contracts.delete",
      entityType: "renovation_contract",
      entityId: contractId,
      payload: { contractNumber: contract.contractNumber },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
