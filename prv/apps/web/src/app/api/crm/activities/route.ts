import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { crmActivities, clients, users } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import {
  activityState,
  summarizeActivities,
  sortActivities,
  CRM_ACTIVITY_TYPES,
  type CrmActivityType,
  type CrmActivityState,
} from "@/lib/crm-activities"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface CrmActivityRow {
  id: string
  clientId: string
  clientName: string | null
  type: CrmActivityType
  subject: string
  notes: string | null
  outcome: string | null
  dueAt: string | null
  completedAt: string | null
  actor: string | null
  state: CrmActivityState
  createdAt: string
}

export interface CrmActivitiesMeta {
  total: number
  open: number
  overdue: number
  done: number
  byType: Record<CrmActivityType, number>
}

// GET /api/crm/activities[?clientId=] — the company activity timeline, or the
// timeline for a single lead/customer, plus a summary (open / overdue / done).
export const GET = withGates(
  { action: "crm.leads.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const clientId = req.nextUrl.searchParams.get("clientId")
    const conditions = [eq(crmActivities.companyId, ctx.session.companyId)]
    if (clientId) conditions.push(eq(crmActivities.clientId, clientId))

    const rows = await db
      .select({
        id: crmActivities.id,
        clientId: crmActivities.clientId,
        clientName: clients.name,
        type: crmActivities.type,
        subject: crmActivities.subject,
        notes: crmActivities.notes,
        outcome: crmActivities.outcome,
        dueAt: crmActivities.dueAt,
        completedAt: crmActivities.completedAt,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        createdAt: crmActivities.createdAt,
      })
      .from(crmActivities)
      .leftJoin(clients, eq(crmActivities.clientId, clients.id))
      .leftJoin(users, eq(crmActivities.actorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(crmActivities.createdAt))

    const now = Date.now()
    const mapped: CrmActivityRow[] = rows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      clientName: r.clientName,
      type: r.type as CrmActivityType,
      subject: r.subject,
      notes: r.notes,
      outcome: r.outcome,
      dueAt: r.dueAt ? r.dueAt.toISOString() : null,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      actor: r.actorFirstName ? `${r.actorFirstName} ${r.actorLastName ?? ""}`.trim() : null,
      state: activityState(
        {
          dueAt: r.dueAt ? r.dueAt.toISOString() : null,
          completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        },
        now
      ),
      createdAt: r.createdAt.toISOString(),
    }))

    const activities = sortActivities(mapped, now)
    const summary = summarizeActivities(
      mapped.map((a) => ({ dueAt: a.dueAt, completedAt: a.completedAt, type: a.type })),
      now
    )
    const meta: CrmActivitiesMeta = {
      total: summary.total,
      open: summary.open,
      overdue: summary.overdue,
      done: summary.done,
      byType: summary.byType,
    }

    return NextResponse.json({ activities, meta })
  }
)

const postSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(CRM_ACTIVITY_TYPES as [CrmActivityType, ...CrmActivityType[]]).default("note"),
  subject: z.string().min(1).max(255),
  notes: z.string().max(4000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

// POST /api/crm/activities — log or schedule an activity against a lead/customer.
export const POST = withGates(
  { action: "crm.leads.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, d.clientId), eq(clients.companyId, companyId)))
      .limit(1)
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

    const [record] = await db
      .insert(crmActivities)
      .values({
        companyId,
        clientId: d.clientId,
        actorId,
        type: d.type,
        subject: d.subject,
        notes: d.notes ?? null,
        dueAt: d.dueAt ? new Date(d.dueAt) : null,
      })
      .returning({ id: crmActivities.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "crm.activity.create",
      entityType: "crm_activity",
      entityId: record?.id ?? d.clientId,
      payload: { clientId: d.clientId, type: d.type, subject: d.subject },
      method: "POST",
      path: "/api/crm/activities",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
