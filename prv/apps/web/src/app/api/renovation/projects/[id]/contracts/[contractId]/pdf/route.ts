import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { renovationContracts, renovationProjects, clients, companies, users } from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { createElement } from "react"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  // /api/renovation/projects/[id]/contracts/[contractId]/pdf
  return { projectId: parts.at(-4) ?? "", contractId: parts.at(-2) ?? "" }
}

export const POST = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, contractId } = ids(req)
    const { companyId, userId } = ctx.session

    const [projectRows, contractRows, companyRows] = await Promise.all([
      db
        .select({
          id: renovationProjects.id,
          title: renovationProjects.title,
          projectCode: renovationProjects.projectCode,
          address: renovationProjects.address,
          clientId: renovationProjects.clientId,
        })
        .from(renovationProjects)
        .where(
          and(
            eq(renovationProjects.id, projectId),
            eq(renovationProjects.companyId, companyId),
            isNull(renovationProjects.deletedAt)
          )
        )
        .limit(1),
      db
        .select({
          id: renovationContracts.id,
          contractNumber: renovationContracts.contractNumber,
          status: renovationContracts.status,
          contractValue: renovationContracts.contractValue,
          currency: renovationContracts.currency,
          startDate: renovationContracts.startDate,
          endDate: renovationContracts.endDate,
          paymentTerms: renovationContracts.paymentTerms,
          createdAt: renovationContracts.createdAt,
        })
        .from(renovationContracts)
        .where(
          and(
            eq(renovationContracts.id, contractId),
            eq(renovationContracts.projectId, projectId),
            isNull(renovationContracts.deletedAt)
          )
        )
        .limit(1),
      db
        .select({
          name: companies.name,
          vatNumber: companies.vatNumber,
          address: companies.address,
          city: companies.city,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1),
    ])

    const project = projectRows[0]
    const contract = contractRows[0]
    if (!project || !contract) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const company = companyRows[0]

    // Fetch client + company CEO in parallel
    const [clientRows, ceoRows] = await Promise.all([
      project.clientId
        ? db
            .select({
              name: clients.name,
              vatNumber: clients.vatNumber,
              address: clients.address,
            })
            .from(clients)
            .where(eq(clients.id, project.clientId))
            .limit(1)
        : Promise.resolve([]),
      db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.role, "ceo")))
        .limit(1),
    ])

    const { ContractPdf, generatePdfBuffer } = await import("@prv/pdf")

    const client = clientRows[0]
    const ceo = ceoRows[0]
    const ceoName = ceo
      ? [ceo.firstName, ceo.lastName].filter(Boolean).join(" ")
      : "Director General"

    const paymentTerms = contract.paymentTerms as Record<string, unknown> | null

    const props = {
      contractNumber: contract.contractNumber,
      contractDate: contract.createdAt.toISOString().slice(0, 10),
      currency: contract.currency,
      companyName: company?.name ?? "PRV",
      companyCUI: company?.vatNumber ?? "",
      companyAddress: [company?.address, company?.city].filter(Boolean).join(", "),
      companyRepresentative: ceoName,
      clientName: client?.name ?? "—",
      clientCUI: client?.vatNumber ?? undefined,
      clientAddress: client?.address ?? "—",
      projectTitle: project.title,
      projectCode: project.projectCode ?? undefined,
      projectAddress: project.address ?? undefined,
      serviceDescription: `lucrări de renovare și amenajare`,
      contractValue: Number(contract.contractValue),
      paymentSchedule:
        typeof paymentTerms?.schedule === "string" ? paymentTerms.schedule : undefined,
      startDate: contract.startDate ?? contract.createdAt.toISOString().slice(0, 10),
      endDate: contract.endDate ?? new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    }

    const element = createElement(ContractPdf, props as any)
    const result = await generatePdfBuffer(element as any)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.contracts.pdf",
      entityType: "renovation_contract",
      entityId: contractId,
      payload: { bytes: result.bytes },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    const filename = `contract-${contract.contractNumber}.pdf`
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(result.bytes),
        "Cache-Control": "no-store",
      },
    })
  }
)
