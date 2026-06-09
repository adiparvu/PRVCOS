import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { tools, users, stores } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ToolStatus = "Available" | "In Use" | "Maintenance" | "Missing"

export interface ToolSummary {
  id: string
  name: string
  model: string
  category: string
  status: ToolStatus
  assignedTo: string | null
  site: string | null
  dueBack: string | null
  location: string | null
  lastUsed: string | null
  utilisationPct: number
  serviceOverdueDays: number | null
}

export interface ToolsMeta {
  total: number
  inUse: number
  inService: number
  missing: number
  serviceAlert: boolean
  overdueCount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function fmtShortDate(d: Date): string {
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`
}

function dbStatusToApi(dbStatus: string): ToolStatus {
  switch (dbStatus) {
    case "in_use":
      return "In Use"
    case "maintenance":
      return "Maintenance"
    case "lost":
    case "retired":
      return "Missing"
    default:
      return "Available"
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET = withGates(
  { action: "tools.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const statusFilter = req.nextUrl.searchParams.get("status") as ToolStatus | null

    const rows = await db
      .select({
        id: tools.id,
        name: tools.name,
        brand: tools.brand,
        model: tools.model,
        category: tools.category,
        status: tools.status,
        lastServiceAt: tools.lastServiceAt,
        notes: tools.notes,
        assignedFirstName: users.firstName,
        assignedLastName: users.lastName,
        storeCity: stores.city,
        storeName: stores.name,
      })
      .from(tools)
      .leftJoin(users, eq(tools.assignedUserId, users.id))
      .leftJoin(stores, eq(tools.storeId, stores.id))
      .where(and(eq(tools.companyId, ctx.session.companyId), isNull(tools.deletedAt)))
      .orderBy(asc(tools.name))

    const all: ToolSummary[] = rows.map((r) => {
      const apiStatus = dbStatusToApi(r.status)
      const isInUse = apiStatus === "In Use"
      const assignedTo =
        r.assignedFirstName && r.assignedLastName
          ? `${r.assignedFirstName} ${r.assignedLastName}`
          : null
      const storeLabel = r.storeCity ?? r.storeName ?? null
      const modelLabel = [r.brand, r.model].filter(Boolean).join(" ") || "—"
      return {
        id: r.id,
        name: r.name,
        model: modelLabel,
        category: r.category ?? "—",
        status: apiStatus,
        assignedTo: isInUse ? assignedTo : null,
        site: isInUse ? storeLabel : null,
        dueBack: null,
        location: !isInUse ? (storeLabel ?? r.notes ?? null) : null,
        lastUsed: r.lastServiceAt ? fmtShortDate(r.lastServiceAt) : null,
        utilisationPct: 0,
        serviceOverdueDays: null,
      }
    })

    const filtered = statusFilter ? all.filter((t) => t.status === statusFilter) : all

    const inUse = all.filter((t) => t.status === "In Use").length
    const inService = all.filter((t) => t.status === "Maintenance").length
    const missing = all.filter((t) => t.status === "Missing").length
    const overdueCount = all.filter((t) => t.serviceOverdueDays !== null).length

    const meta: ToolsMeta = {
      total: all.length,
      inUse,
      inService,
      missing,
      serviceAlert: inService > 0,
      overdueCount,
    }

    return NextResponse.json({ tools: filtered, count: filtered.length, meta })
  }
)
