import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, projects } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  projectName: z.string().min(1).max(200).optional(),
  note: z.string().max(500).optional(),
})

export const POST = withGates(
  { action: "crm.quotes.convert.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-3, -2)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { projectName, note } = parsed.data
    const { userId, companyId, sessionId } = ctx.session

    const [quote] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        clientId: invoices.clientId,
        total: invoices.total,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        projectId: invoices.projectId,
      })
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
      .limit(1)

    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!["sent", "paid"].includes(quote.status))
      return NextResponse.json({ error: `Cannot convert a quote in status '${quote.status}'` }, { status: 409 })
    if (quote.projectId)
      return NextResponse.json({ error: "Quote already linked to a project" }, { status: 409 })

    const name = projectName ?? `Project from ${quote.invoiceNumber}`

    const [newProject] = await db
      .insert(projects)
      .values({
        companyId,
        clientId: quote.clientId,
        ownerId: userId,
        name,
        description: note ?? null,
        budget: quote.total,
        currency: quote.currency ?? "RON",
        status: "draft",
        metadata: { convertedFromQuoteId: id, convertedFromRef: quote.invoiceNumber },
      })
      .returning({ id: projects.id, name: projects.name })

    if (!newProject) return NextResponse.json({ error: "Failed to create project" }, { status: 500 })

    await db
      .update(invoices)
      .set({ projectId: newProject.id, status: "paid", paidAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "crm.quote.converted",
      entityType: "quote",
      entityId: id,
      payload: { projectId: newProject.id, projectName: name, note: note ?? null },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, id, projectId: newProject.id, projectName: name })
  }
)
