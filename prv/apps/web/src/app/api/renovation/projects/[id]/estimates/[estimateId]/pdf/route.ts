import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import {
  renovationEstimates,
  renovationEstimateLines,
  renovationProjects,
  clients,
  companies,
} from "@prv/db/schema"
import { eq, and, isNull, asc } from "drizzle-orm"
import { createElement } from "react"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  // /api/renovation/projects/[id]/estimates/[estimateId]/pdf
  return { projectId: parts.at(-4) ?? "", estimateId: parts.at(-2) ?? "" }
}

export const POST = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, estimateId } = ids(req)
    const { companyId, userId } = ctx.session

    const [projectRows, estimateRows, companyRows] = await Promise.all([
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
          id: renovationEstimates.id,
          estimateNumber: renovationEstimates.estimateNumber,
          status: renovationEstimates.status,
          validUntil: renovationEstimates.validUntil,
          subtotal: renovationEstimates.subtotal,
          vatRate: renovationEstimates.vatRate,
          vatAmount: renovationEstimates.vatAmount,
          total: renovationEstimates.total,
          currency: renovationEstimates.currency,
          notes: renovationEstimates.notes,
          createdAt: renovationEstimates.createdAt,
        })
        .from(renovationEstimates)
        .where(
          and(
            eq(renovationEstimates.id, estimateId),
            eq(renovationEstimates.projectId, projectId),
            isNull(renovationEstimates.deletedAt)
          )
        )
        .limit(1),
      db
        .select({
          name: companies.name,
          vatNumber: companies.vatNumber,
          address: companies.address,
          city: companies.city,
          email: companies.email,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1),
    ])

    const project = projectRows[0]
    const estimate = estimateRows[0]
    if (!project || !estimate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const company = companyRows[0]

    const [lineRows, clientRows] = await Promise.all([
      db
        .select()
        .from(renovationEstimateLines)
        .where(eq(renovationEstimateLines.estimateId, estimateId))
        .orderBy(asc(renovationEstimateLines.lineNumber)),
      project.clientId
        ? db
            .select({ name: clients.name, vatNumber: clients.vatNumber, address: clients.address })
            .from(clients)
            .where(eq(clients.id, project.clientId))
            .limit(1)
        : Promise.resolve([]),
    ])

    const { DevizPdf, generatePdfBuffer } = await import("@prv/pdf")

    const statusMap: Record<string, "draft" | "sent" | "accepted" | "rejected"> = {
      draft: "draft",
      sent_to_client: "sent",
      accepted: "accepted",
      rejected: "rejected",
      superseded: "rejected",
    }

    const client = clientRows[0]

    // Group lines into a single chapter (the estimate doesn't have chapters by default)
    const chapter = {
      code: "01",
      title: estimate.estimateNumber,
      items: lineRows.map((l) => ({
        description: l.description,
        unit: l.unit ?? "buc",
        quantity: Number(l.quantity),
        unitPriceTotal: Number(l.unitPrice),
        total: Number(l.totalPrice),
      })),
      subtotal: Number(estimate.subtotal),
    }

    const props = {
      devizNumber: estimate.estimateNumber,
      issueDate: estimate.createdAt.toISOString().slice(0, 10),
      validUntil: estimate.validUntil ?? undefined,
      currency: estimate.currency,
      companyName: company?.name ?? "PRV",
      companyCUI: company?.vatNumber ?? "",
      companyAddress: [company?.address, company?.city].filter(Boolean).join(", "),
      companyEmail: company?.email ?? undefined,
      clientName: client?.name ?? "—",
      clientCUI: client?.vatNumber ?? undefined,
      clientAddress: client?.address ?? undefined,
      projectTitle: project.title,
      projectCode: project.projectCode ?? undefined,
      projectAddress: project.address ?? undefined,
      chapters: [chapter],
      subtotal: Number(estimate.subtotal),
      vatRate: Number(estimate.vatRate) / 100,
      vatAmount: Number(estimate.vatAmount),
      total: Number(estimate.total),
      notes: estimate.notes ?? undefined,
      status: statusMap[estimate.status] ?? "draft",
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(DevizPdf, props as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generatePdfBuffer(element as any)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.estimates.pdf",
      entityType: "renovation_estimate",
      entityId: estimateId,
      payload: { bytes: result.bytes },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    const filename = `deviz-${estimate.estimateNumber}.pdf`
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
