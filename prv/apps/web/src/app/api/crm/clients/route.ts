import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ClientStatus = "vip" | "active" | "lead" | "cold"

export interface ClientSummary {
  id: string
  initials: string
  name: string
  location: string
  status: ClientStatus
  ltv: number
  activeProjects: number
  openQuotes: number
  nps: number | null
  since: string
}

const MOCK_CLIENTS: ClientSummary[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
]

export const GET = withGates(
  { action: "crm.clients.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as ClientStatus | null
    const results = status ? MOCK_CLIENTS.filter((c) => c.status === status) : MOCK_CLIENTS
    return NextResponse.json({ clients: results, count: results.length })
  }
)
