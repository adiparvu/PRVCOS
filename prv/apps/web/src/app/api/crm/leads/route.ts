import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { clients, users } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"
export type LeadSource = "website" | "referral" | "cold_call" | "social" | "event" | "partner"

export interface Lead {
  id: string
  name: string
  company?: string
  email: string
  phone: string
  source: LeadSource
  stage: LeadStage
  score: number
  estimatedValue: number
  assignedTo: string
  lastActivity: string
  createdAt: string
  notes?: string
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

const createSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  source: z.enum(["website", "referral", "cold_call", "social", "event", "partner"]),
  estimatedValue: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
})

export const GET = withGates(
  { action: "crm.leads.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
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
          eq(clients.companyId, companyId),
          eq(clients.status, "prospect"),
          isNull(clients.deletedAt)
        )
      )
      .orderBy(desc(clients.createdAt))

    const leads: Lead[] = rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>
      const stage = (meta.stage as LeadStage) ?? "new"
      const score = typeof meta.score === "number" ? meta.score : 0
      const source = (meta.source as LeadSource) ?? "website"
      const estimatedValue = typeof meta.estimatedValue === "number" ? meta.estimatedValue : 0
      const company = typeof meta.company === "string" ? meta.company : undefined
      const assignedTo = r.assignedFirstName
        ? `${r.assignedFirstName} ${r.assignedLastName}`
        : "Unassigned"
      return {
        id: r.id,
        name: r.name,
        company,
        email: r.email ?? "",
        phone: r.phone ?? "",
        source,
        stage,
        score,
        estimatedValue,
        assignedTo,
        lastActivity: timeAgo(r.updatedAt),
        createdAt: r.createdAt.toISOString().slice(0, 10),
        notes: r.notes ?? undefined,
      }
    })

    const pipeline: Record<LeadStage, Lead[]> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    }
    for (const lead of leads) {
      pipeline[lead.stage].push(lead)
    }

    const totalValue = leads.reduce((s, l) => s + l.estimatedValue, 0)
    const hotLeads = leads.filter((l) => l.score >= 70).length
    const activeLeads = leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length

    return NextResponse.json({
      leads,
      pipeline,
      meta: {
        total: leads.length,
        active: activeLeads,
        hot: hotLeads,
        pipelineValue: totalValue,
      },
    })
  }
)

export const POST = withGates(
  { action: "crm.leads.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const raw = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

    const { companyId, userId } = ctx.session
    const { name, company, email, phone, source, estimatedValue, notes } = parsed.data

    const [inserted] = await db
      .insert(clients)
      .values({
        companyId,
        name,
        email,
        phone,
        notes: notes ?? null,
        status: "prospect",
        metadata: {
          stage: "new",
          score: 0,
          source,
          estimatedValue: estimatedValue ?? 0,
          ...(company ? { company } : {}),
        },
      })
      .returning()

    if (!inserted) return NextResponse.json({ error: "Database error" }, { status: 500 })

    await writeAuditLog({
      actorId: userId,
      companyId,
      action: "crm.lead.created",
      entityType: "lead",
      entityId: inserted.id,
      payload: { name, source },
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    })

    const newLead: Lead = {
      id: inserted.id,
      name,
      company,
      email,
      phone,
      source: source as LeadSource,
      stage: "new",
      score: 0,
      estimatedValue: estimatedValue ?? 0,
      assignedTo: "Unassigned",
      lastActivity: "just now",
      createdAt: inserted.createdAt.toISOString().slice(0, 10),
      notes,
    }

    return NextResponse.json({ success: true, lead: newLead }, { status: 201 })
  }
)
