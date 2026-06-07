import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"

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

const MOCK_LEADS: Lead[] = [
  {
    id: "l1",
    name: "Familia Dinu",
    email: "dinu.alex@gmail.com",
    phone: "0740 111 222",
    source: "website",
    stage: "new",
    score: 42,
    estimatedValue: 14000,
    assignedTo: "Andrei P.",
    lastActivity: "2 ore",
    createdAt: "2026-06-05",
    notes: "Interested in full kitchen renovation. Has budget confirmed.",
  },
  {
    id: "l2",
    name: "Cosmin Vlad",
    email: "cosmin.vlad@yahoo.com",
    phone: "0755 333 444",
    source: "referral",
    stage: "new",
    score: 31,
    estimatedValue: 8500,
    assignedTo: "Maria S.",
    lastActivity: "1 zi",
    createdAt: "2026-06-04",
    notes: "Bathroom renovation. Referred by Mihai Popescu.",
  },
  {
    id: "l3",
    name: "Elena Marinescu",
    email: "elena.m@gmail.com",
    phone: "0722 555 666",
    source: "social",
    stage: "contacted",
    score: 58,
    estimatedValue: 21000,
    assignedTo: "Andrei P.",
    lastActivity: "3 ore",
    createdAt: "2026-06-01",
    notes: "Full apartment renovation. Very responsive on Instagram DMs.",
  },
  {
    id: "l4",
    name: "TechHub Cluj SRL",
    company: "TechHub Cluj SRL",
    email: "office@techhub.ro",
    phone: "0264 777 888",
    source: "event",
    stage: "contacted",
    score: 71,
    estimatedValue: 55000,
    assignedTo: "Ionuț D.",
    lastActivity: "5 ore",
    createdAt: "2026-05-28",
    notes: "Office fitout. Met at Cluj Business Forum. High potential.",
  },
  {
    id: "l5",
    name: "Victor Stanciu",
    email: "v.stanciu@gmail.com",
    phone: "0733 999 000",
    source: "website",
    stage: "qualified",
    score: 76,
    estimatedValue: 32000,
    assignedTo: "Maria S.",
    lastActivity: "1 oră",
    createdAt: "2026-05-20",
    notes: "Penthouse renovation. Budget confirmed €30-35K. Very motivated.",
  },
  {
    id: "l6",
    name: "Andrei Florescu",
    company: "Florescu & Partners",
    email: "a.florescu@fp.ro",
    phone: "0744 222 333",
    source: "partner",
    stage: "qualified",
    score: 84,
    estimatedValue: 78000,
    assignedTo: "Ionuț D.",
    lastActivity: "30 min",
    createdAt: "2026-05-15",
    notes: "Commercial space renovation. Decision maker confirmed. Q3 start.",
  },
  {
    id: "l7",
    name: "Ana Ionescu",
    email: "ana.ionescu@yahoo.com",
    phone: "0722 987 654",
    source: "website",
    stage: "proposal",
    score: 88,
    estimatedValue: 24200,
    assignedTo: "Andrei P.",
    lastActivity: "2 zile",
    createdAt: "2026-05-10",
    notes: "Kitchen + living renovation. Quote #Q-042 sent. Awaiting decision.",
  },
  {
    id: "l8",
    name: "SC Modern SRL",
    company: "SC Modern SRL",
    email: "contact@modern.ro",
    phone: "0265 444 555",
    source: "cold_call",
    stage: "proposal",
    score: 65,
    estimatedValue: 38000,
    assignedTo: "Maria S.",
    lastActivity: "3 zile",
    createdAt: "2026-05-08",
    notes: "Office renovation proposal sent. Awaiting board approval.",
  },
  {
    id: "l9",
    name: "Horia Munteanu",
    email: "horia.m@gmail.com",
    phone: "0766 111 999",
    source: "referral",
    stage: "negotiation",
    score: 91,
    estimatedValue: 19500,
    assignedTo: "Ionuț D.",
    lastActivity: "1 oră",
    createdAt: "2026-04-28",
    notes: "Apartment renovation. Price negotiation in progress. Close to deal.",
  },
]

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
  async (_req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const pipeline: Record<LeadStage, Lead[]> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    }
    for (const lead of MOCK_LEADS) {
      pipeline[lead.stage].push(lead)
    }

    const totalValue = MOCK_LEADS.reduce((s, l) => s + l.estimatedValue, 0)
    const hotLeads = MOCK_LEADS.filter((l) => l.score >= 70).length
    const activeLeads = MOCK_LEADS.filter((l) => l.stage !== "won" && l.stage !== "lost").length

    return NextResponse.json({
      leads: MOCK_LEADS,
      pipeline,
      meta: {
        total: MOCK_LEADS.length,
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

    const newLead: Lead = {
      id: `l${Date.now()}`,
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email,
      phone: parsed.data.phone,
      source: parsed.data.source,
      notes: parsed.data.notes,
      estimatedValue: parsed.data.estimatedValue ?? 0,
      stage: "new",
      score: 0,
      assignedTo: "Unassigned",
      lastActivity: "just now",
      createdAt: new Date().toISOString().slice(0, 10),
    }

    await writeAuditLog({
      actorId: ctx.session.userId,
      companyId: ctx.session.companyId,
      action: "crm.lead.created",
      entityType: "lead",
      entityId: newLead.id,
      payload: { name: newLead.name, source: newLead.source },
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
    })

    return NextResponse.json({ success: true, lead: newLead }, { status: 201 })
  }
)
