import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { ClientSummary } from "../route"

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

const MOCK_DETAIL: Record<string, ClientDetail> = {
  c1: {
    id: "c1",
    initials: "MP",
    name: "Mihai Popescu",
    location: "Cluj-Napoca",
    status: "vip",
    ltv: 42800,
    activeProjects: 2,
    openQuotes: 1,
    nps: 8.9,
    since: "2024",
    phone: "+40 740 123 456",
    email: "mihai.popescu@gmail.com",
    cifVat: "PF",
    address: "Str. Avram Iancu 10, Cluj-Napoca",
    contactPerson: "Mihai Popescu",
    totalInvoiced: 42800,
    totalPaid: 42800,
    quotes: [
      {
        id: "q-045",
        ref: "Q-045",
        projectName: "Renovare bucătărie Cluj",
        amount: 16800,
        status: "sent",
      },
      {
        id: "q-039",
        ref: "Q-039",
        projectName: "Baie master etaj 2",
        amount: 12000,
        status: "accepted",
      },
    ],
    invoices: [
      {
        id: "inv-201",
        ref: "INV-201",
        projectName: "Renovare Apartament Floreasca",
        amount: 18400,
        status: "paid",
      },
      {
        id: "inv-198",
        ref: "INV-198",
        projectName: "Baie master etaj 2",
        amount: 12000,
        status: "paid",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Renovare Apartament Floreasca",
        status: "active",
        completionPct: 59,
        currentPhaseName: "Execution",
        budget: 38000,
        spent: 22400,
        daysLeft: 23,
      },
      {
        id: "p-mp2",
        name: "Baie Modernă Cluj",
        status: "done",
        completionPct: 100,
        currentPhaseName: "Handover",
        budget: 14000,
        spent: 13200,
        daysLeft: 0,
      },
    ],
    activities: [
      {
        id: "a5",
        type: "quote_sent",
        text: "Ofertă Q-045 trimisă — renovare bucătărie €16,800",
        timestamp: "2026-06-01T10:00:00Z",
      },
      {
        id: "a4",
        type: "invoice_paid",
        text: "Factură INV-201 plătită integral — €18,400",
        timestamp: "2026-05-20T14:00:00Z",
      },
      {
        id: "a3",
        type: "quote_accepted",
        text: "Ofertă Q-039 acceptată — baie master €12,000",
        timestamp: "2026-04-15T11:30:00Z",
      },
      {
        id: "a2",
        type: "project_started",
        text: "Proiect Renovare Apartament Floreasca demarat",
        timestamp: "2026-05-02T09:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Client Mihai Popescu adăugat în CRM",
        timestamp: "2024-03-10T08:00:00Z",
      },
    ],
  },
  c2: {
    id: "c2",
    initials: "AG",
    name: "Andronic Group SRL",
    location: "București",
    status: "active",
    ltv: 67000,
    activeProjects: 1,
    openQuotes: 1,
    nps: 7.4,
    since: "2025",
    phone: "+40 264 456 789",
    email: "office@andronic.ro",
    cifVat: "RO22345678",
    address: "Bd. Unirii 14, Sector 3, București",
    contactPerson: "Ion Andronic",
    totalInvoiced: 67000,
    totalPaid: 48800,
    quotes: [
      {
        id: "q-048",
        ref: "Q-048",
        projectName: "Renovare birouri București",
        amount: 24400,
        status: "sent",
      },
    ],
    invoices: [
      {
        id: "inv-208",
        ref: "INV-208",
        projectName: "Spațiu Comercial București",
        amount: 18200,
        status: "overdue",
      },
      {
        id: "inv-203",
        ref: "INV-203",
        projectName: "Spațiu Comercial etaj 1",
        amount: 30000,
        status: "paid",
      },
    ],
    projects: [
      {
        id: "p-ag1",
        name: "Spațiu Comercial București",
        status: "active",
        completionPct: 28,
        currentPhaseName: "Execution",
        budget: 67000,
        spent: 18800,
        daysLeft: 21,
      },
    ],
    activities: [
      {
        id: "a4",
        type: "invoice_overdue",
        text: "Factură INV-208 scadentă neachitată — €18,200",
        timestamp: "2026-05-25T09:00:00Z",
      },
      {
        id: "a3",
        type: "quote_sent",
        text: "Ofertă Q-048 trimisă — renovare birouri v2.1",
        timestamp: "2026-05-28T14:30:00Z",
      },
      {
        id: "a2",
        type: "project_started",
        text: "Proiect Spațiu Comercial demarat",
        timestamp: "2026-04-30T09:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Client Andronic Group SRL adăugat în CRM",
        timestamp: "2025-01-15T08:00:00Z",
      },
    ],
  },
  c3: {
    id: "c3",
    initials: "AI",
    name: "Ana Ionescu",
    location: "Timișoara",
    status: "lead",
    ltv: 0,
    activeProjects: 0,
    openQuotes: 1,
    nps: null,
    since: "2026",
    phone: "+40 722 987 654",
    email: "ana.ionescu@yahoo.com",
    cifVat: "PF",
    address: "Str. Republicii 5, Timișoara",
    contactPerson: "Ana Ionescu",
    totalInvoiced: 0,
    totalPaid: 0,
    quotes: [
      {
        id: "q-042",
        ref: "Q-042",
        projectName: "Bucătărie + Living Timișoara",
        amount: 24200,
        status: "sent",
      },
    ],
    invoices: [],
    projects: [],
    activities: [
      {
        id: "a3",
        type: "quote_sent",
        text: "Ofertă Q-042 trimisă — bucătărie + living €24,200",
        timestamp: "2026-06-01T09:00:00Z",
      },
      {
        id: "a2",
        type: "note",
        text: "Consultație inițială — birou Timișoara, 1h",
        timestamp: "2026-05-28T11:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Lead Ana Ionescu adăugat via formular website",
        timestamp: "2026-05-24T14:00:00Z",
      },
    ],
  },
  c4: {
    id: "c4",
    initials: "BC",
    name: "Biroul Construct SRL",
    location: "Brașov",
    status: "active",
    ltv: 31400,
    activeProjects: 2,
    openQuotes: 0,
    nps: 8.1,
    since: "2024",
    phone: "+40 268 321 654",
    email: "contact@birouconstruct.ro",
    cifVat: "RO33456789",
    address: "Str. Mureșenilor 8, Brașov",
    contactPerson: "Pavel Birău",
    totalInvoiced: 31400,
    totalPaid: 31400,
    quotes: [
      {
        id: "q-047",
        ref: "Q-047",
        projectName: "Amenajare spații comerciale",
        amount: 18200,
        status: "sent",
      },
    ],
    invoices: [
      {
        id: "inv-207",
        ref: "INV-207",
        projectName: "Renovare birou etaj 1",
        amount: 9200,
        status: "paid",
      },
      {
        id: "inv-205",
        ref: "INV-205",
        projectName: "Warehouse fit-out",
        amount: 22200,
        status: "paid",
      },
    ],
    projects: [
      {
        id: "p4",
        name: "Pardoseli Comerciale Brașov",
        status: "active",
        completionPct: 91,
        currentPhaseName: "Floor Installation",
        budget: 17000,
        spent: 19200,
        daysLeft: 8,
      },
      {
        id: "p2",
        name: "Baie Modernă Cluj",
        status: "review",
        completionPct: 84,
        currentPhaseName: "Finishing Touches",
        budget: 14000,
        spent: 11800,
        daysLeft: 5,
      },
    ],
    activities: [
      {
        id: "a3",
        type: "invoice_paid",
        text: "Factură INV-205 plătită — warehouse €22,200",
        timestamp: "2026-06-03T14:00:00Z",
      },
      {
        id: "a2",
        type: "project_started",
        text: "Proiect Pardoseli Comerciale demarat",
        timestamp: "2026-05-01T09:00:00Z",
      },
      {
        id: "a1",
        type: "created",
        text: "Client Biroul Construct SRL adăugat în CRM",
        timestamp: "2024-02-20T08:00:00Z",
      },
    ],
  },
  c5: {
    id: "c5",
    initials: "RN",
    name: "Radu Niculescu",
    location: "Iași",
    status: "cold",
    ltv: 8600,
    activeProjects: 0,
    openQuotes: 0,
    nps: 6.5,
    since: "2024",
    phone: "+40 755 111 222",
    email: "radu.n@gmail.com",
    cifVat: "PF",
    address: "Str. Păcurari 22, Iași",
    contactPerson: "Radu Niculescu",
    totalInvoiced: 8600,
    totalPaid: 8600,
    quotes: [],
    invoices: [
      {
        id: "inv-196",
        ref: "INV-196",
        projectName: "Pardoseli Iași Copou",
        amount: 8600,
        status: "paid",
      },
    ],
    projects: [],
    activities: [
      {
        id: "a2",
        type: "project_completed",
        text: "Proiect Pardoseli Iași Copou finalizat",
        timestamp: "2026-03-03T16:00:00Z",
      },
      {
        id: "a1",
        type: "invoice_paid",
        text: "Factură finală plătită — €8,600",
        timestamp: "2026-03-05T10:00:00Z",
      },
    ],
  },
}

export const GET = withGates(
  { action: "crm.clients.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const client = MOCK_DETAIL[id]
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ client })
  }
)
