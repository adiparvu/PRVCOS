import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { clients, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import type { Lead, LeadStage, LeadSource } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface LeadActivity {
  id: string
  type: "call" | "email" | "message" | "stage_change" | "created" | "note"
  text: string
  actor: string
  timestamp: string
}

export interface LeadDetail extends Lead {
  activities: LeadActivity[]
}

function timeAgo(d: Date): string {
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return diffMin <= 1 ? "just now" : `${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `${diffD} zile`
}

export const GET = withGates(
  { action: "crm.leads.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const rows = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        notes: clients.notes,
        metadata: clients.metadata,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        assignedFirstName: users.firstName,
        assignedLastName: users.lastName,
      })
      .from(clients)
      .leftJoin(users, eq(clients.assignedUserId, users.id))
      .where(
        and(
          eq(clients.id, id),
          eq(clients.companyId, companyId),
          eq(clients.status, "prospect"),
          isNull(clients.deletedAt)
        )
      )
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const stage = (meta.stage as LeadStage) ?? "new"
    const score = typeof meta.score === "number" ? meta.score : 0
    const source = (meta.source as LeadSource) ?? "website"
    const estimatedValue = typeof meta.estimatedValue === "number" ? meta.estimatedValue : 0
    const company = typeof meta.company === "string" ? meta.company : undefined

    const assignedTo = row.assignedFirstName
      ? `${row.assignedFirstName} ${row.assignedLastName}`
      : "Unassigned"

    const lead: LeadDetail = {
      id: row.id,
      name: row.name,
      company,
      email: row.email ?? "",
      phone: row.phone ?? "",
      source,
      stage,
      score,
      estimatedValue,
      assignedTo,
      lastActivity: timeAgo(row.updatedAt),
      createdAt: row.createdAt.toISOString().slice(0, 10),
      notes: row.notes ?? undefined,
      activities: [
        {
          id: "ac-created",
          type: "created",
          text: "Lead creat",
          actor: "System",
          timestamp: row.createdAt.toISOString(),
        },
      ],
    }

    return NextResponse.json({ lead })
  }
)
