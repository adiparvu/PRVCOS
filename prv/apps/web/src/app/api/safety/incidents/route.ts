import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyIncidents, users } from "@prv/db/schema"
import { and, count, eq, desc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export type IncidentSeverity = "low" | "medium" | "high" | "critical"
export type IncidentStatus = "open" | "under_investigation" | "resolved" | "closed"
export type IncidentType =
  | "accident"
  | "near_miss"
  | "hazard"
  | "property_damage"
  | "environmental"
  | "security"

export interface IncidentSummary {
  id: string
  title: string
  type: IncidentType
  severity: IncidentSeverity
  status: IncidentStatus
  location: string | null
  incidentAt: string
  reportedBy: string | null
  injuriesCount: number
}

export interface IncidentsMeta {
  total: number
  open: number
  underInvestigation: number
  resolved: number
  critical: number
}

const LIMIT = 50

// ── GET /api/safety/incidents ─────────────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const statusFilter = req.nextUrl.searchParams.get("status") as IncidentStatus | null
    const severityFilter = req.nextUrl.searchParams.get("severity") as IncidentSeverity | null
    const limitParam = req.nextUrl.searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || LIMIT, 200) : LIMIT

    const rows = await db
      .select({
        id: safetyIncidents.id,
        title: safetyIncidents.title,
        type: safetyIncidents.type,
        severity: safetyIncidents.severity,
        status: safetyIncidents.status,
        location: safetyIncidents.location,
        incidentAt: safetyIncidents.incidentAt,
        injuriesCount: safetyIncidents.injuriesCount,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
      })
      .from(safetyIncidents)
      .leftJoin(users, eq(safetyIncidents.reportedBy, users.id))
      .where(
        and(
          eq(safetyIncidents.companyId, companyId),
          statusFilter ? eq(safetyIncidents.status, statusFilter) : undefined,
          severityFilter ? eq(safetyIncidents.severity, severityFilter) : undefined
        )
      )
      .orderBy(desc(safetyIncidents.incidentAt))
      .limit(limit)

    const [totalRow, openRow, underInvRow, resolvedRow, criticalRow] = await Promise.all([
      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(eq(safetyIncidents.companyId, companyId)),
      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(and(eq(safetyIncidents.companyId, companyId), eq(safetyIncidents.status, "open"))),
      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(
          and(
            eq(safetyIncidents.companyId, companyId),
            eq(safetyIncidents.status, "under_investigation")
          )
        ),
      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(
          and(eq(safetyIncidents.companyId, companyId), eq(safetyIncidents.status, "resolved"))
        ),
      db
        .select({ value: count() })
        .from(safetyIncidents)
        .where(
          and(eq(safetyIncidents.companyId, companyId), eq(safetyIncidents.severity, "critical"))
        ),
    ])

    const incidents: IncidentSummary[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type as IncidentType,
      severity: r.severity as IncidentSeverity,
      status: r.status as IncidentStatus,
      location: r.location ?? null,
      incidentAt: r.incidentAt.toISOString(),
      reportedBy:
        r.reporterFirstName && r.reporterLastName
          ? `${r.reporterFirstName} ${r.reporterLastName}`
          : null,
      injuriesCount: r.injuriesCount,
    }))

    const meta: IncidentsMeta = {
      total: totalRow[0]?.value ?? 0,
      open: openRow[0]?.value ?? 0,
      underInvestigation: underInvRow[0]?.value ?? 0,
      resolved: resolvedRow[0]?.value ?? 0,
      critical: criticalRow[0]?.value ?? 0,
    }

    return NextResponse.json({ incidents, meta })
  }
)

// ── POST /api/safety/incidents ────────────────────────────────────────────────

const createIncidentSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  type: z.enum(["accident", "near_miss", "hazard", "property_damage", "environmental", "security"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  location: z.string().max(300).optional(),
  incidentAt: z.string().datetime(),
  projectId: z.string().uuid().optional(),
  injuriesCount: z.number().int().nonnegative().optional(),
})

export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createIncidentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const d = parsed.data

    const [record] = await db
      .insert(safetyIncidents)
      .values({
        companyId,
        reportedBy: userId,
        status: "open",
        title: d.title,
        description: d.description,
        type: d.type,
        severity: d.severity,
        location: d.location,
        incidentAt: new Date(d.incidentAt),
        projectId: d.projectId ?? null,
        injuriesCount: d.injuriesCount ?? 0,
      })
      .returning({ id: safetyIncidents.id, title: safetyIncidents.title })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.incident.create",
      entityType: "safety_incident",
      entityId: record.id,
      payload: d,
      method: "POST",
      path: "/api/safety/incidents",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
  }
)
