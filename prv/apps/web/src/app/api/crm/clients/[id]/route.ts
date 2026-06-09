import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { clients, clientContacts, users, projects, invoices, auditLogs } from "@prv/db/schema"
import { and, count, desc, eq, inArray, isNull, sum } from "drizzle-orm"
import { z } from "zod"
import type { ClientSummary, ClientStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ClientActivityType =
  | "quote_sent"
  | "quote_accepted"
  | "quote_rejected"
  | "invoice_paid"
  | "invoice_overdue"
  | "project_started"
  | "project_completed"
  | "note"
  | "created"

export interface LinkedQuote {
  id: string
  ref: string
  projectName: string
  amount: number
  status: "draft" | "sent" | "accepted" | "rejected" | "expired"
}

export interface LinkedInvoice {
  id: string
  ref: string
  projectName: string
  amount: number
  status: "overdue" | "due" | "partial" | "paid" | "draft" | "void"
}

export interface LinkedProject {
  id: string
  name: string
  status: "active" | "planning" | "review" | "done" | "hold"
  completionPct: number
  currentPhaseName: string
  budget: number
  spent: number
  daysLeft: number
}

export interface ClientActivity {
  id: string
  type: ClientActivityType
  text: string
  timestamp: string
}

export interface ClientDetail extends ClientSummary {
  phone: string
  email: string
  cifVat: string
  address: string
  contactPerson: string
  totalInvoiced: number
  totalPaid: number
  quotes: LinkedQuote[]
  invoices: LinkedInvoice[]
  projects: LinkedProject[]
  activities: ClientActivity[]
}

const VIP_LTV_THRESHOLD = 30_000

function toApiStatus(dbStatus: string, ltv: number): ClientStatus {
  if (dbStatus === "archived" || dbStatus === "inactive") return "cold"
  if (dbStatus === "prospect") return "lead"
  return ltv >= VIP_LTV_THRESHOLD ? "vip" : "active"
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "--").toUpperCase()
  return ((parts[0]?.[0] ?? "-") + (parts[parts.length - 1]?.[0] ?? "-")).toUpperCase()
}

function daysLeft(dueDate: string | null): number {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

const DB_PROJECT_STATUS_MAP: Record<string, "active" | "planning" | "review" | "done" | "hold"> = {
  draft: "planning",
  active: "active",
  on_hold: "hold",
  completed: "done",
  cancelled: "done",
  archived: "done",
}

const DB_INVOICE_STATUS_MAP: Record<string, LinkedInvoice["status"]> = {
  draft: "draft",
  sent: "due",
  paid: "paid",
  overdue: "overdue",
  cancelled: "void",
  refunded: "void",
}

function auditToClientActivity(log: {
  id: string
  action: string
  createdAt: Date
}): ClientActivity {
  const type: ClientActivityType = (() => {
    if (log.action === "crm.clients.create") return "created"
    if (log.action.includes("quote") && log.action.includes("create")) return "quote_sent"
    if (log.action.includes("projects.create")) return "project_started"
    if (log.action.includes("invoice")) return "invoice_paid"
    return "note"
  })()
  const text = (() => {
    if (log.action === "crm.clients.create") return "Client înregistrat"
    if (log.action === "crm.clients.update") return "Client actualizat"
    if (log.action.includes("quote")) return "Ofertă înregistrată"
    if (log.action.includes("invoice")) return "Factură actualizată"
    if (log.action.includes("project")) return "Proiect modificat"
    return log.action
  })()
  return { id: log.id, type, text, timestamp: log.createdAt.toISOString() }
}

export const GET = withGates(
  { action: "crm.clients.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [clientRows, contactRows, invoiceRows, projectRows, openQuotesCountRow, activityRows] =
      await Promise.all([
      db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          vatNumber: clients.vatNumber,
          address: clients.address,
          city: clients.city,
          status: clients.status,
          createdAt: clients.createdAt,
          assignedFirstName: users.firstName,
          assignedLastName: users.lastName,
        })
        .from(clients)
        .leftJoin(users, eq(clients.assignedUserId, users.id))
        .where(and(eq(clients.id, id), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
        .limit(1),

      db
        .select({
          firstName: clientContacts.firstName,
          lastName: clientContacts.lastName,
          isPrimary: clientContacts.isPrimary,
        })
        .from(clientContacts)
        .where(eq(clientContacts.clientId, id))
        .orderBy(desc(clientContacts.isPrimary))
        .limit(5),

      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          status: invoices.status,
          projectId: invoices.projectId,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.clientId, id),
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt)
          )
        )
        .orderBy(desc(invoices.createdAt))
        .limit(20),

      db
        .select({
          id: projects.id,
          name: projects.name,
          status: projects.status,
          budget: projects.budget,
          dueDate: projects.dueDate,
          metadata: projects.metadata,
        })
        .from(projects)
        .where(
          and(
            eq(projects.clientId, id),
            eq(projects.companyId, companyId),
            isNull(projects.deletedAt)
          )
        )
        .orderBy(desc(projects.createdAt))
        .limit(20),

      db
        .select({ cnt: count() })
        .from(invoices)
        .where(
          and(
            eq(invoices.clientId, id),
            eq(invoices.companyId, companyId),
            inArray(invoices.status, ["draft", "sent"]),
            isNull(invoices.deletedAt)
          )
        ),

      db
        .select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.companyId, companyId),
            eq(auditLogs.entityId, id),
            eq(auditLogs.entityType, "client")
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(10),
    ])

    const row = clientRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const spentByProject = new Map<string, number>()
    for (const inv of invoiceRows) {
      if (inv.projectId && inv.status !== "cancelled" && inv.status !== "refunded") {
        spentByProject.set(inv.projectId, (spentByProject.get(inv.projectId) ?? 0) + Number(inv.total))
      }
    }
    const openQuotesCount = openQuotesCountRow[0]?.cnt ?? 0
    const activities: ClientActivity[] = activityRows.map(auditToClientActivity)

    const totalInvoiced = invoiceRows.reduce((s, r) => s + Number(r.total), 0)
    const totalPaid = invoiceRows
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + Number(r.total), 0)

    const apiStatus = toApiStatus(row.status, totalInvoiced)

    const primaryContact = contactRows[0]
    const contactPerson = primaryContact
      ? `${primaryContact.firstName} ${primaryContact.lastName}`
      : (row.name ?? "—")

    const linkedInvoices: LinkedInvoice[] = invoiceRows.map((r) => ({
      id: r.id,
      ref: r.invoiceNumber,
      projectName: "",
      amount: Number(r.total),
      status: DB_INVOICE_STATUS_MAP[r.status] ?? "draft",
    }))

    const linkedProjects: LinkedProject[] = projectRows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>
      const completionPct = typeof meta.completionPct === "number" ? meta.completionPct : 0
      const currentPhaseName =
        typeof meta.currentPhaseName === "string"
          ? meta.currentPhaseName
          : (DB_PROJECT_STATUS_MAP[r.status] ?? "planning")
      return {
        id: r.id,
        name: r.name,
        status: DB_PROJECT_STATUS_MAP[r.status] ?? "planning",
        completionPct,
        currentPhaseName,
        budget: Number(r.budget ?? 0),
        spent: spentByProject.get(r.id) ?? 0,
        daysLeft: daysLeft(r.dueDate ?? null),
      }
    })

    const detail: ClientDetail = {
      id: row.id,
      initials: initials(row.name),
      name: row.name,
      location: row.city ?? "—",
      status: apiStatus,
      ltv: totalInvoiced,
      activeProjects: linkedProjects.filter((p) => p.status === "active").length,
      openQuotes: openQuotesCount,
      nps: null,
      since: String(new Date(row.createdAt).getFullYear()),
      phone: row.phone ?? "—",
      email: row.email ?? "—",
      cifVat: row.vatNumber ?? "—",
      address: row.address ?? "—",
      contactPerson,
      totalInvoiced,
      totalPaid,
      quotes: [],
      invoices: linkedInvoices,
      projects: linkedProjects,
      activities,
    }

    return NextResponse.json({ client: detail })
  }
)

const patchClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(32).optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  postalCode: z.string().max(20).optional(),
  vatNumber: z.string().max(50).optional(),
  registrationNumber: z.string().max(50).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  type: z.enum(["individual", "business"]).optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
})

export const PATCH = withGates(
  { action: "crm.clients.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [existing] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchClientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })
    }

    const [updated] = await db
      .update(clients)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .returning({ id: clients.id })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "crm.clients.update",
      entityType: "client",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/crm/clients/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

export const DELETE = withGates(
  { action: "crm.clients.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [existing] = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId), isNull(clients.deletedAt)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(clients)
      .set({ isActive: false, deletedAt: new Date(), status: "archived" as const, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "crm.clients.delete",
      entityType: "client",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/crm/clients/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
