import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import {
  invoices,
  invoiceItems,
  clients,
  clientContacts,
  projects,
  companies,
} from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { createElement } from "react"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function invoiceId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return parts.at(-2) ?? ""
}

export const POST = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = invoiceId(req)
    const { companyId, userId } = ctx.session

    // Fetch invoice + company in parallel
    const [invRows, companyRows] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          subtotal: invoices.subtotal,
          vatAmount: invoices.vatAmount,
          total: invoices.total,
          clientId: invoices.clientId,
          clientName: clients.name,
          clientAddress: clients.address,
          clientVatNumber: clients.vatNumber,
          projectName: projects.name,
          notes: invoices.notes,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(
          and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
        )
        .limit(1),
      db
        .select({
          name: companies.name,
          vatNumber: companies.vatNumber,
          registrationNumber: companies.registrationNumber,
          address: companies.address,
          city: companies.city,
          email: companies.email,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1),
    ])

    const inv = invRows[0]
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const company = companyRows[0]

    const [itemRows, contactRows] = await Promise.all([
      db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id))
        .orderBy(invoiceItems.sortOrder),
      inv.clientId
        ? db
            .select({ firstName: clientContacts.firstName, lastName: clientContacts.lastName })
            .from(clientContacts)
            .where(
              and(eq(clientContacts.clientId, inv.clientId), eq(clientContacts.isPrimary, true))
            )
            .limit(1)
        : Promise.resolve([]),
    ])

    const { InvoicePdf, generatePdfBuffer } = await import("@prv/pdf")

    const uiStatus = (() => {
      if (inv.status === "paid") return "paid"
      if (inv.status === "cancelled") return "void" as const
      if (inv.status === "draft") return "draft" as const
      return new Date(inv.dueDate) < new Date() ? ("overdue" as const) : ("sent" as const)
    })()

    const props = {
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      companyName: company?.name ?? "PRV",
      companyAddress: [company?.address, company?.city].filter(Boolean).join(", "),
      companyCUI: company?.vatNumber ?? "",
      companyRegCom: company?.registrationNumber ?? undefined,
      companyEmail: company?.email ?? undefined,
      clientName: inv.clientName ?? "—",
      clientCUI: inv.clientVatNumber ?? undefined,
      items: itemRows.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate ?? 19),
        total: Number(item.total),
      })),
      subtotal: Number(inv.subtotal),
      vatAmount: Number(inv.vatAmount),
      total: Number(inv.total),
      notes: inv.notes ?? undefined,
      status: uiStatus === "void" ? undefined : uiStatus,
    }

    const element = createElement(InvoicePdf, props as any)
    const result = await generatePdfBuffer(element as any)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "finance.invoices.pdf",
      entityType: "invoice",
      entityId: id,
      payload: { bytes: result.bytes },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${inv.invoiceNumber}.pdf"`,
        "Content-Length": String(result.bytes),
        "Cache-Control": "no-store",
      },
    })
  }
)
