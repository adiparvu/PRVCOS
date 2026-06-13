import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationContracts, renovationProjects } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

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

    const contracts = await db
      .select()
      .from(renovationContracts)
      .where(and(eq(renovationContracts.projectId, id), isNull(renovationContracts.deletedAt)))
      .orderBy(desc(renovationContracts.createdAt))

    return NextResponse.json({
      contracts: contracts.map((c) => ({
        ...c,
        contractValue: Number(c.contractValue),
      })),
    })
  }
)

const createSchema = z.object({
  contractNumber: z.string().min(1).max(50),
  status: z.enum(["draft", "sent", "signed", "active", "completed", "terminated"]).optional(),
  contractValue: z.number().nonnegative(),
  currency: z.string().length(3).optional(),
  estimateId: z.string().uuid().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentTerms: z.record(z.unknown()).optional(),
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

    const { contractValue, ...rest } = parsed.data
    const [contract] = await db
      .insert(renovationContracts)
      .values({
        projectId: id,
        ...rest,
        contractValue: String(contractValue),
      })
      .returning({
        id: renovationContracts.id,
        contractNumber: renovationContracts.contractNumber,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.contracts.create",
      entityType: "renovation_contract",
      entityId: contract!.id,
      payload: parsed.data,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(contract, { status: 201 })
  }
)
