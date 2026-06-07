import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired"

export interface QuoteSummary {
  id: string
  ref: string
  clientId: string
  clientName: string
  clientInitials: string
  status: QuoteStatus
  amount: number
  issuedDate: string
  expiryDate: string
  daysUntilExpiry: number | null
  projectName: string
  version: string
}

const MOCK_QUOTES: QuoteSummary[] = [
  {
    id: "q-048",
    ref: "Q-048",
    clientId: "c2",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    status: "sent",
    amount: 24400,
    issuedDate: "2026-05-28",
    expiryDate: "2026-06-10",
    daysUntilExpiry: 3,
    projectName: "Renovare birouri București",
    version: "v2.1",
  },
  {
    id: "q-047",
    ref: "Q-047",
    clientId: "c4",
    clientName: "Biroul Construct SRL",
    clientInitials: "BC",
    status: "sent",
    amount: 18200,
    issuedDate: "2026-05-24",
    expiryDate: "2026-06-19",
    daysUntilExpiry: 12,
    projectName: "Amenajare spații comerciale",
    version: "v1.0",
  },
  {
    id: "q-046",
    ref: "Q-046",
    clientId: "c3",
    clientName: "Radu Construct SRL",
    clientInitials: "RC",
    status: "draft",
    amount: 31000,
    issuedDate: "2026-06-05",
    expiryDate: "2026-06-30",
    daysUntilExpiry: null,
    projectName: "Bucătărie industrială Timișoara",
    version: "v1.2",
  },
  {
    id: "q-045",
    ref: "Q-045",
    clientId: "c5",
    clientName: "Prima Biroul SRL",
    clientInitials: "PB",
    status: "sent",
    amount: 10900,
    issuedDate: "2026-05-30",
    expiryDate: "2026-06-15",
    daysUntilExpiry: 8,
    projectName: "Renovare apartament Floreasca",
    version: "v1.0",
  },
  {
    id: "q-044",
    ref: "Q-044",
    clientId: "c6",
    clientName: "Alfa Business SRL",
    clientInitials: "AB",
    status: "accepted",
    amount: 8700,
    issuedDate: "2026-05-20",
    expiryDate: "2026-06-14",
    daysUntilExpiry: null,
    projectName: "Pardoseli epoxidice hală",
    version: "v1.0",
  },
  {
    id: "q-043",
    ref: "Q-043",
    clientId: "c7",
    clientName: "SC Modern SRL",
    clientInitials: "SM",
    status: "rejected",
    amount: 38000,
    issuedDate: "2026-05-10",
    expiryDate: "2026-06-04",
    daysUntilExpiry: null,
    projectName: "Amenajare birou open-space",
    version: "v2.0",
  },
  {
    id: "q-042",
    ref: "Q-042",
    clientId: "c3",
    clientName: "Ana Ionescu",
    clientInitials: "AI",
    status: "sent",
    amount: 24200,
    issuedDate: "2026-06-01",
    expiryDate: "2026-06-22",
    daysUntilExpiry: 15,
    projectName: "Bucătărie + Living Timișoara",
    version: "v1.0",
  },
]

export const GET = withGates(
  { action: "crm.quotes.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const clientId = searchParams.get("clientId")
    let results = MOCK_QUOTES
    if (status) results = results.filter((q) => q.status === status)
    if (clientId) results = results.filter((q) => q.clientId === clientId)
    return NextResponse.json({ quotes: results, count: results.length })
  }
)
