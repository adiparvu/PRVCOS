import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { Lead } from "../route"

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

const MOCK_LEAD_DETAILS: Record<string, LeadDetail> = {
  l1: {
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
    activities: [
      {
        id: "a1",
        type: "created",
        text: "Lead creat din formular website",
        actor: "System",
        timestamp: "2026-06-05T09:00:00Z",
      },
    ],
  },
  l2: {
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
    activities: [
      {
        id: "a1",
        type: "created",
        text: "Lead creat prin referral Mihai Popescu",
        actor: "System",
        timestamp: "2026-06-04T10:30:00Z",
      },
    ],
  },
  l3: {
    id: "l3",
    name: "Elena Marinescu",
    email: "elena.m@gmail.com",
    phone: "0722 555 666",
    source: "social",
    stage: "qualified",
    score: 58,
    estimatedValue: 21000,
    assignedTo: "Andrei P.",
    lastActivity: "3 ore",
    createdAt: "2026-06-01",
    notes:
      "Full apartment renovation. Very responsive on Instagram DMs. Budget confirmed ~€20-25k.",
    activities: [
      {
        id: "a3",
        type: "call",
        text: "Apel inițiat — discuție buget confirmată",
        actor: "Andrei P.",
        timestamp: "2026-06-07T08:00:00Z",
      },
      {
        id: "a2",
        type: "message",
        text: "DM Instagram răspuns — detalii apartament",
        actor: "Elena Marinescu",
        timestamp: "2026-06-06T14:22:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Lead creat din Instagram",
        actor: "System",
        timestamp: "2026-06-01T11:00:00Z",
      },
    ],
  },
  l4: {
    id: "l4",
    name: "Corp Business SRL",
    company: "Corp Business SRL",
    email: "office@corpbusiness.ro",
    phone: "0733 777 888",
    source: "event",
    stage: "proposal",
    score: 74,
    estimatedValue: 85000,
    assignedTo: "Andrei P.",
    lastActivity: "5 ore",
    createdAt: "2026-05-20",
    notes: "Full commercial space renovation. Met at Construcții Expo 2026.",
    activities: [
      {
        id: "a4",
        type: "stage_change",
        text: "Ofertă trimisă — €85,000",
        actor: "Andrei P.",
        timestamp: "2026-06-07T07:00:00Z",
      },
      {
        id: "a3",
        type: "email",
        text: "Email specificații tehnice trimis",
        actor: "Andrei P.",
        timestamp: "2026-06-05T15:00:00Z",
      },
      {
        id: "a2",
        type: "call",
        text: "Apel de calificare — buget confirmat",
        actor: "Andrei P.",
        timestamp: "2026-05-28T10:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Lead creat după eveniment Expo",
        actor: "Andrei P.",
        timestamp: "2026-05-20T18:00:00Z",
      },
    ],
  },
}

export const GET = withGates(
  { action: "crm.leads.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const lead = MOCK_LEAD_DETAILS[id]
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ lead })
  }
)
