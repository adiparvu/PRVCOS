import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ProjectStatus = "active" | "planning" | "review" | "done" | "hold"

export interface ProjectTeamMember {
  id: string
  initials: string
  name: string
  role: string
}

export interface ProjectSummary {
  id: string
  name: string
  clientId: string
  clientName: string
  clientInitials: string
  status: ProjectStatus
  currentPhaseName: string
  completionPct: number
  budget: number
  spent: number
  startDate: string
  endDate: string
  daysLeft: number
  team: ProjectTeamMember[]
}

const MOCK_PROJECTS: ProjectSummary[] = [
  {
    id: "p1",
    name: "Renovare Apartament Floreasca",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    status: "active",
    currentPhaseName: "Execution",
    completionPct: 59,
    budget: 38000,
    spent: 22400,
    startDate: "2026-05-02",
    endDate: "2026-06-27",
    daysLeft: 23,
    team: [
      { id: "e3", initials: "MP", name: "Mihai Popescu", role: "Lead Tech" },
      { id: "e7", initials: "GS", name: "George Stoica", role: "Electrician" },
      { id: "e9", initials: "RC", name: "Radu Ciobanu", role: "Tiler" },
      { id: "e10", initials: "AR", name: "Andrei Roșu", role: "Plumber" },
      { id: "e11", initials: "LG", name: "Liviu Groza", role: "Painter" },
    ],
  },
  {
    id: "p2",
    name: "Baie Modernă Cluj",
    clientId: "c2",
    clientName: "Biroul Construct SRL",
    clientInitials: "BC",
    status: "review",
    currentPhaseName: "Review",
    completionPct: 84,
    budget: 14000,
    spent: 11800,
    startDate: "2026-05-10",
    endDate: "2026-06-11",
    daysLeft: 5,
    team: [
      { id: "e4", initials: "EP", name: "Elena Popescu", role: "PM" },
      { id: "e8", initials: "DM", name: "Dan Marin", role: "Tiler" },
    ],
  },
  {
    id: "p3",
    name: "Bucătărie Integrată Timișoara",
    clientId: "c3",
    clientName: "Radu Construct SRL",
    clientInitials: "RC",
    status: "planning",
    currentPhaseName: "Planning",
    completionPct: 33,
    budget: 24500,
    spent: 8100,
    startDate: "2026-05-20",
    endDate: "2026-07-17",
    daysLeft: 41,
    team: [
      { id: "e12", initials: "AR", name: "Anca Rusu", role: "Designer" },
      { id: "e13", initials: "LG", name: "Lucian Ganea", role: "Carpenter" },
    ],
  },
  {
    id: "p4",
    name: "Pardoseli Comerciale Brașov",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    status: "active",
    currentPhaseName: "Execution",
    completionPct: 91,
    budget: 17000,
    spent: 19200,
    startDate: "2026-05-01",
    endDate: "2026-06-14",
    daysLeft: 8,
    team: [
      { id: "e14", initials: "TN", name: "Tudor Niculescu", role: "Lead Tech" },
      { id: "e15", initials: "IA", name: "Ion Avram", role: "Flooring Spec." },
      { id: "e3", initials: "MP", name: "Mihai Popescu", role: "Tech" },
    ],
  },
]

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const results = status ? MOCK_PROJECTS.filter((p) => p.status === status) : MOCK_PROJECTS
    return NextResponse.json({ projects: results, count: results.length })
  }
)
