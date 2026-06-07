import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { ApprovalSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ChainStepStatus = "done" | "current" | "pending"

export interface ChainStep {
  id: string
  name: string
  role: string
  status: ChainStepStatus
  timestamp: string | null
}

export interface ActivityEntry {
  id: string
  authorInitials: string
  authorName: string
  text: string
  timestamp: string
  isSystem: boolean
}

export interface ApprovalDetail extends ApprovalSummary {
  project: string | null
  supplier: string | null
  delivery: string | null
  paymentTerms: string | null
  neededBy: string | null
  itemCount: number | null
  chain: ChainStep[]
  activity: ActivityEntry[]
}

const MOCK_DETAIL: Record<string, ApprovalDetail> = {
  a1: {
    id: "a1",
    type: "purchase",
    ref: "PO-0195",
    title: "Scânduri grinzi 14×14 cm",
    requestedBy: "Ion Crișan",
    description: "Materiale construcții · Proiect A4 Brașov",
    value: 1850,
    deadline: "8 Iun 2026",
    daysUntilDeadline: 1,
    status: "Urgent",
    project: "A4 Brașov",
    supplier: "LemnPro SRL",
    delivery: "Ex Works Cluj",
    paymentTerms: "Net 30",
    neededBy: "9 Iun 2026",
    itemCount: 3,
    chain: [
      {
        id: "c1",
        name: "Ion Crișan",
        role: "Solicitant · Creat 6 Iun 10:24",
        status: "done",
        timestamp: "6 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Termen: 8 Iun",
        status: "current",
        timestamp: null,
      },
      {
        id: "c3",
        name: "Elena Marin",
        role: "Director · Nivel 2 · €2,000+",
        status: "pending",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "IC",
        authorName: "Ion Crișan",
        text: "Am verificat prețul cu 3 furnizori. LemnPro oferă cel mai bun raport calitate/preț.",
        timestamp: "6 Iun · 10:24",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "6 Iun · 10:25",
        isSystem: true,
      },
    ],
  },
  a2: {
    id: "a2",
    type: "leave",
    ref: "CO-0042",
    title: "Radu Dima — 7 zile concediu",
    requestedBy: "Radu Dima",
    description: "10–17 Iun · Concediu anual",
    value: null,
    deadline: "4 Iun 2026",
    daysUntilDeadline: -3,
    status: "Expired",
    project: null,
    supplier: null,
    delivery: null,
    paymentTerms: null,
    neededBy: "10 Iun 2026",
    itemCount: null,
    chain: [
      {
        id: "c1",
        name: "Radu Dima",
        role: "Solicitant · Creat 2 Iun 09:00",
        status: "done",
        timestamp: "2 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Expirat 4 Iun",
        status: "current",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "RD",
        authorName: "Radu Dima",
        text: "Concediu planificat. Transferul sarcinilor a fost aranjat cu Sorin Florea.",
        timestamp: "2 Iun · 09:00",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "2 Iun · 09:01",
        isSystem: true,
      },
      {
        id: "ac3",
        authorInitials: "SY",
        authorName: "System",
        text: "Atenție: termenul de aprobare a expirat pe 4 Iun",
        timestamp: "4 Iun · 23:59",
        isSystem: true,
      },
    ],
  },
  a3: {
    id: "a3",
    type: "expense",
    ref: "CH-0188",
    title: "Diurnă deplasare Brașov",
    requestedBy: "Sorin Florea",
    description: "3–5 Iun · Combustibil + cazare",
    value: 420,
    deadline: "5 Iun 2026",
    daysUntilDeadline: -2,
    status: "Expired",
    project: "A4 Brașov",
    supplier: null,
    delivery: null,
    paymentTerms: null,
    neededBy: null,
    itemCount: 4,
    chain: [
      {
        id: "c1",
        name: "Sorin Florea",
        role: "Solicitant · Creat 3 Iun 18:30",
        status: "done",
        timestamp: "3 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Expirat 5 Iun",
        status: "current",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "SF",
        authorName: "Sorin Florea",
        text: "Chitanțele sunt atașate. Deplasare necesară pentru livrare materiale.",
        timestamp: "3 Iun · 18:30",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "3 Iun · 18:31",
        isSystem: true,
      },
    ],
  },
  a4: {
    id: "a4",
    type: "purchase",
    ref: "PO-0196",
    title: "Vopsea lavabilă 20L × 8",
    requestedBy: "Elena Marin",
    description: "Materiale finisaj · Cluj Mănăștur",
    value: 640,
    deadline: "12 Iun 2026",
    daysUntilDeadline: 5,
    status: "Pending",
    project: "Cluj Mănăștur",
    supplier: "ColorPro SRL",
    delivery: "Livrare la șantier",
    paymentTerms: "Net 15",
    neededBy: "14 Iun 2026",
    itemCount: 2,
    chain: [
      {
        id: "c1",
        name: "Elena Marin",
        role: "Solicitant · Creat 7 Iun 14:10",
        status: "done",
        timestamp: "7 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Termen: 12 Iun",
        status: "current",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "EM",
        authorName: "Elena Marin",
        text: "Necesară pentru finisarea apartamentelor 3–8. Ofertă validată.",
        timestamp: "7 Iun · 14:10",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "7 Iun · 14:11",
        isSystem: true,
      },
    ],
  },
  a5: {
    id: "a5",
    type: "contract",
    ref: "CT-0031",
    title: "Contract Renovare — Bloc A4",
    requestedBy: "Elena Marin",
    description: "Lucrări complete · 90 zile · Brașov",
    value: 48000,
    deadline: "10 Iun 2026",
    daysUntilDeadline: 3,
    status: "Pending",
    project: "A4 Brașov",
    supplier: "Construct Pro SRL",
    delivery: null,
    paymentTerms: "30% avans · 70% final",
    neededBy: "15 Iun 2026",
    itemCount: null,
    chain: [
      {
        id: "c1",
        name: "Elena Marin",
        role: "Solicitant · Creat 5 Iun 11:00",
        status: "done",
        timestamp: "5 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Termen: 10 Iun",
        status: "current",
        timestamp: null,
      },
      {
        id: "c3",
        name: "Director General",
        role: "Nivel 2 · Contracte >€20,000",
        status: "pending",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "EM",
        authorName: "Elena Marin",
        text: "Contract revizuit de avocați. Clauzele penalizatoare au fost ajustate.",
        timestamp: "5 Iun · 11:00",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "5 Iun · 11:01",
        isSystem: true,
      },
      {
        id: "ac3",
        authorInitials: "EM",
        authorName: "Elena Marin",
        text: "Versiunea finală v2 atașată. Clientul a confirmat disponibilitatea.",
        timestamp: "6 Iun · 09:30",
        isSystem: false,
      },
    ],
  },
  a6: {
    id: "a6",
    type: "leave",
    ref: "CO-0043",
    title: "Ana Stoica — 5 zile concediu",
    requestedBy: "Ana Stoica",
    description: "1–5 Iul · Concediu anual",
    value: null,
    deadline: "12 Iun 2026",
    daysUntilDeadline: 5,
    status: "Pending",
    project: null,
    supplier: null,
    delivery: null,
    paymentTerms: null,
    neededBy: "1 Iul 2026",
    itemCount: null,
    chain: [
      {
        id: "c1",
        name: "Ana Stoica",
        role: "Solicitant · Creat 6 Iun 16:00",
        status: "done",
        timestamp: "6 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Termen: 12 Iun",
        status: "current",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "AS",
        authorName: "Ana Stoica",
        text: "Concediu planificat din timp. Acoperire asigurată cu Ion Crișan.",
        timestamp: "6 Iun · 16:00",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "6 Iun · 16:01",
        isSystem: true,
      },
    ],
  },
  a7: {
    id: "a7",
    type: "expense",
    ref: "CH-0189",
    title: "Combustibil + autostradă",
    requestedBy: "Radu Dima",
    description: "Deplasare Cluj–Brașov",
    value: 185,
    deadline: "9 Iun 2026",
    daysUntilDeadline: 2,
    status: "Pending",
    project: "A4 Brașov",
    supplier: null,
    delivery: null,
    paymentTerms: null,
    neededBy: null,
    itemCount: 3,
    chain: [
      {
        id: "c1",
        name: "Radu Dima",
        role: "Solicitant · Creat 7 Iun 08:00",
        status: "done",
        timestamp: "7 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Termen: 9 Iun",
        status: "current",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "RD",
        authorName: "Radu Dima",
        text: "Bon fiscal atașat. Deplasare la șantier A4.",
        timestamp: "7 Iun · 08:00",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "7 Iun · 08:01",
        isSystem: true,
      },
    ],
  },
  a8: {
    id: "a8",
    type: "overtime",
    ref: "OR-0077",
    title: "Ore suplimentare — 12h",
    requestedBy: "Liviu Toma",
    description: "Weekend · șantier Cluj Mănăștur",
    value: null,
    deadline: "9 Iun 2026",
    daysUntilDeadline: 2,
    status: "Pending",
    project: "Cluj Mănăștur",
    supplier: null,
    delivery: null,
    paymentTerms: null,
    neededBy: "14–15 Iun 2026",
    itemCount: null,
    chain: [
      {
        id: "c1",
        name: "Liviu Toma",
        role: "Solicitant · Creat 7 Iun 17:00",
        status: "done",
        timestamp: "7 Iun",
      },
      {
        id: "c2",
        name: "Tu · Manager Proiect",
        role: "Nivel 1 · Termen: 9 Iun",
        status: "current",
        timestamp: null,
      },
    ],
    activity: [
      {
        id: "ac1",
        authorInitials: "LT",
        authorName: "Liviu Toma",
        text: "Necesar pentru a termina turnarea la termen. Echipa disponibilă.",
        timestamp: "7 Iun · 17:00",
        isSystem: false,
      },
      {
        id: "ac2",
        authorInitials: "SY",
        authorName: "System",
        text: "Cerere trimisă spre aprobare → Manager Proiect",
        timestamp: "7 Iun · 17:01",
        isSystem: true,
      },
    ],
  },
}

export const GET = withGates(
  { action: "approvals.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const approval = MOCK_DETAIL[id]
    if (!approval) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ approval })
  }
)
