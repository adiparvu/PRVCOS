import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices, projects } from "@prv/db/schema"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { PortalQuotesClient, type PortalQuote } from "./PortalQuotesClient"

export const metadata: Metadata = { title: "Quotes" }
export const dynamic = "force-dynamic"

export default async function PortalQuotesPage() {
  const session = await getPortalSession()
  if (!session || !session.clientId) redirect("/portal/login")

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      total: invoices.total,
      currency: invoices.currency,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      metadata: invoices.metadata,
      projectName: projects.name,
    })
    .from(invoices)
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(
      and(
        eq(invoices.companyId, session.companyId),
        eq(invoices.clientId, session.clientId),
        isNull(invoices.deletedAt),
        inArray(invoices.status, ["sent", "cancelled"])
      )
    )
    .orderBy(desc(invoices.issueDate))

  const quotes: PortalQuote[] = rows.map((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>
    const decision = typeof meta.clientDecision === "string" ? meta.clientDecision : null
    return {
      id: r.id,
      ref: r.invoiceNumber,
      status: r.status,
      decision: decision === "accepted" || decision === "rejected" ? decision : null,
      total: Number(r.total),
      currency: r.currency,
      issueDate: String(r.issueDate),
      dueDate: String(r.dueDate),
      project: r.projectName ?? null,
      pending: r.status === "sent" && !decision,
    }
  })

  return <PortalQuotesClient quotes={quotes} />
}
