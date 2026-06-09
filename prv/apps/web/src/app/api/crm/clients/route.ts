import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { clients, invoices, projects } from "@prv/db/schema"
import { and, count, desc, eq, inArray, isNotNull, isNull, notInArray, sum } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ClientStatus = "vip" | "active" | "lead" | "cold"

export interface ClientSummary {
  id: string
  initials: string
  name: string
  location: string
  status: ClientStatus
  ltv: number
  activeProjects: number
  openQuotes: number
  nps: number | null
  since: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "crm.clients.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") as ClientStatus | null

    // 1. Fetch clients for this company (exclude archived)
    const clientRows = await db
      .select({
        id: clients.id,
        name: clients.name,
        city: clients.city,
        status: clients.status,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(
        and(
          eq(clients.companyId, ctx.session.companyId),
          isNull(clients.deletedAt),
          notInArray(clients.status, ["archived"])
        )
      )
      .orderBy(desc(clients.createdAt))

    if (clientRows.length === 0) {
      return NextResponse.json({ clients: [], count: 0 })
    }

    const clientIds = clientRows.map((c) => c.id)

    // 2. LTV (paid invoices) and active project counts — parallel
    const [ltvRows, projectRows] = await Promise.all([
      db
        .select({ clientId: invoices.clientId, total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, ctx.session.companyId),
            eq(invoices.status, "paid"),
            isNotNull(invoices.clientId),
            inArray(invoices.clientId, clientIds),
            isNull(invoices.deletedAt)
          )
        )
        .groupBy(invoices.clientId),

      db
        .select({ clientId: projects.clientId, cnt: count() })
        .from(projects)
        .where(
          and(
            eq(projects.companyId, ctx.session.companyId),
            isNotNull(projects.clientId),
            inArray(projects.clientId, clientIds),
            eq(projects.status, "active"),
            isNull(projects.deletedAt)
          )
        )
        .groupBy(projects.clientId),
    ])

    const ltvByClient = new Map<string, number>()
    for (const row of ltvRows) {
      if (row.clientId) ltvByClient.set(row.clientId, Number(row.total ?? 0))
    }

    const activeProjectsByClient = new Map<string, number>()
    for (const row of projectRows) {
      if (row.clientId) activeProjectsByClient.set(row.clientId, row.cnt)
    }

    // 3. Assemble and optionally filter by API status
    const result: ClientSummary[] = clientRows
      .map((c) => {
        const ltv = ltvByClient.get(c.id) ?? 0
        return {
          id: c.id,
          initials: initials(c.name),
          name: c.name,
          location: c.city ?? "—",
          status: toApiStatus(c.status, ltv),
          ltv,
          activeProjects: activeProjectsByClient.get(c.id) ?? 0,
          openQuotes: 0,
          nps: null,
          since: new Date(c.createdAt).getFullYear().toString(),
        }
      })
      .filter((c) => !statusFilter || c.status === statusFilter)

    return NextResponse.json({ clients: result, count: result.length })
  }
)
