import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { clients, projects, invoices, users } from "@prv/db/schema"
import { eq, and, isNull, notInArray, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "RON" ? "RON " : currency === "EUR" ? "€" : `${currency} `
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(2)}k`
  return `${symbol}${amount.toFixed(2)}`
}

const PROJECT_STATUS_DISPLAY: Record<string, string> = {
  pending: "Pending",
  planning: "Planning",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const clientId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!clientId) {
    return NextResponse.json({ error: "Missing client ID" }, { status: 400 })
  }

  const [clientRow] = await db
    .select({
      id: clients.id,
      name: clients.name,
      type: clients.type,
      status: clients.status,
      email: clients.email,
      phone: clients.phone,
      website: clients.website,
      vatNumber: clients.vatNumber,
      registrationNumber: clients.registrationNumber,
      country: clients.country,
      city: clients.city,
      address: clients.address,
      postalCode: clients.postalCode,
      notes: clients.notes,
      tags: clients.tags,
      assignedUserId: clients.assignedUserId,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(
      and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId), isNull(clients.deletedAt))
    )
    .limit(1)

  if (!clientRow) {
    return NextResponse.json({ error: "Client not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const [projectRows, invoiceRows, assignedRow] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        budget: projects.budget,
        currency: projects.currency,
        dueDate: projects.dueDate,
      })
      .from(projects)
      .where(
        and(
          eq(projects.clientId, clientId),
          eq(projects.companyId, ctx.companyId),
          isNull(projects.deletedAt),
          notInArray(projects.status, ["completed", "cancelled", "archived"])
        )
      )
      .limit(10),

    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.clientId, clientId),
          eq(invoices.companyId, ctx.companyId),
          isNull(invoices.deletedAt)
        )
      )
      .orderBy(desc(invoices.issueDate))
      .limit(20),

    clientRow.assignedUserId
      ? db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, clientRow.assignedUserId))
          .limit(1)
      : Promise.resolve([]),
  ])

  const defaultCurrency = clientRow.country === "RO" ? "RON" : "EUR"
  const invoiceCurrency = invoiceRows[0]?.currency ?? defaultCurrency

  const totalBilled = invoiceRows
    .filter((inv) => inv.status !== "cancelled")
    .reduce((acc, inv) => acc + Number(inv.total), 0)

  const openInvoicesCount = invoiceRows.filter((inv) =>
    ["draft", "sent", "overdue"].includes(inv.status)
  ).length

  return NextResponse.json({
    client: {
      id: clientRow.id,
      name: clientRow.name,
      type: clientRow.type,
      status: clientRow.status,
      email: clientRow.email ?? null,
      phone: clientRow.phone ?? null,
      website: clientRow.website ?? null,
      vatNumber: clientRow.vatNumber ?? null,
      registrationNumber: clientRow.registrationNumber ?? null,
      country: clientRow.country,
      city: clientRow.city ?? null,
      address: clientRow.address ?? null,
      postalCode: clientRow.postalCode ?? null,
      notes: clientRow.notes ?? null,
      tags: (clientRow.tags as string[]) ?? [],
      createdAt: clientRow.createdAt,
    },
    assignedTo: assignedRow[0]
      ? { id: assignedRow[0].id, name: `${assignedRow[0].firstName} ${assignedRow[0].lastName}` }
      : null,
    kpis: {
      totalBilled: totalBilled > 0 ? formatCurrency(totalBilled, invoiceCurrency) : null,
      openInvoicesCount,
      projectsCount: projectRows.length,
    },
    projects: projectRows.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      statusLabel: PROJECT_STATUS_DISPLAY[p.status] ?? p.status,
      budget: p.budget ? formatCurrency(Number(p.budget), p.currency ?? defaultCurrency) : null,
      dueDate: p.dueDate ?? null,
    })),
    invoices: invoiceRows.slice(0, 5).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: formatCurrency(Number(inv.total), inv.currency),
      issueDate: inv.issueDate,
    })),
  })
})
