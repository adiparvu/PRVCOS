import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import type { ProjectSummary } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ProjectPhaseState = "done" | "active" | "upcoming"
export type ProjectActivityType = "complete" | "warning" | "note" | "flag"

export interface ProjectPhase {
  id: string
  num: number
  name: string
  startDate: string
  endDate: string
  completionPct: number
  state: ProjectPhaseState
}

export interface ProjectMilestone {
  id: string
  text: string
  done: boolean
  dueDate: string
}

export interface ProjectActivity {
  id: string
  type: ProjectActivityType
  text: string
  timestamp: string
}

export interface ProjectDetail extends ProjectSummary {
  clientContactName: string
  clientPhone: string
  phases: ProjectPhase[]
  milestones: ProjectMilestone[]
  activities: ProjectActivity[]
}

const MOCK_DETAIL: Record<string, ProjectDetail> = {
  p1: {
    id: "p1",
    name: "Renovare Apartament Floreasca",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    clientContactName: "Ion Andronic",
    clientPhone: "+40 744 123 456",
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
    phases: [
      {
        id: "ph1",
        num: 1,
        name: "Planning",
        startDate: "2026-05-02",
        endDate: "2026-05-08",
        completionPct: 100,
        state: "done",
      },
      {
        id: "ph2",
        num: 2,
        name: "Demolition & Prep",
        startDate: "2026-05-09",
        endDate: "2026-05-18",
        completionPct: 100,
        state: "done",
      },
      {
        id: "ph3",
        num: 3,
        name: "Execution",
        startDate: "2026-05-19",
        endDate: "2026-06-20",
        completionPct: 59,
        state: "active",
      },
      {
        id: "ph4",
        num: 4,
        name: "Review & Snagging",
        startDate: "2026-06-20",
        endDate: "2026-06-25",
        completionPct: 0,
        state: "upcoming",
      },
      {
        id: "ph5",
        num: 5,
        name: "Handover",
        startDate: "2026-06-27",
        endDate: "2026-06-27",
        completionPct: 0,
        state: "upcoming",
      },
    ],
    milestones: [
      { id: "m1", text: "Site survey approved", done: true, dueDate: "2026-05-03" },
      { id: "m2", text: "Materials ordered", done: true, dueDate: "2026-05-10" },
      { id: "m3", text: "Electrical rough-in", done: false, dueDate: "2026-06-12" },
      { id: "m4", text: "Tiling complete", done: false, dueDate: "2026-06-18" },
      { id: "m5", text: "Final inspection", done: false, dueDate: "2026-06-26" },
    ],
    activities: [
      {
        id: "a1",
        type: "complete",
        text: "Waterproofing marked complete by George Stoica",
        timestamp: "2026-06-06T11:32:00Z",
      },
      {
        id: "a2",
        type: "warning",
        text: "Material delivery delayed — tiles arrive Jun 10",
        timestamp: "2026-06-05T15:04:00Z",
      },
      {
        id: "a3",
        type: "note",
        text: "Site note added by Mihai Popescu",
        timestamp: "2026-06-04T09:17:00Z",
      },
      {
        id: "a4",
        type: "complete",
        text: "Demolition phase completed ahead of schedule",
        timestamp: "2026-05-18T16:00:00Z",
      },
    ],
  },
  p2: {
    id: "p2",
    name: "Baie Modernă Cluj",
    clientId: "c2",
    clientName: "Biroul Construct SRL",
    clientInitials: "BC",
    clientContactName: "Pavel Birău",
    clientPhone: "+40 722 987 654",
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
    phases: [
      {
        id: "ph1",
        num: 1,
        name: "Demolition",
        startDate: "2026-05-10",
        endDate: "2026-05-13",
        completionPct: 100,
        state: "done",
      },
      {
        id: "ph2",
        num: 2,
        name: "Waterproofing",
        startDate: "2026-05-14",
        endDate: "2026-05-16",
        completionPct: 100,
        state: "done",
      },
      {
        id: "ph3",
        num: 3,
        name: "Tiling & Fixtures",
        startDate: "2026-05-17",
        endDate: "2026-06-01",
        completionPct: 100,
        state: "done",
      },
      {
        id: "ph4",
        num: 4,
        name: "Finishing Touches",
        startDate: "2026-06-02",
        endDate: "2026-06-08",
        completionPct: 70,
        state: "active",
      },
      {
        id: "ph5",
        num: 5,
        name: "Client Sign-Off",
        startDate: "2026-06-11",
        endDate: "2026-06-11",
        completionPct: 0,
        state: "upcoming",
      },
    ],
    milestones: [
      { id: "m1", text: "Waterproofing tested", done: true, dueDate: "2026-05-17" },
      { id: "m2", text: "Tiles grouted", done: true, dueDate: "2026-06-01" },
      { id: "m3", text: "Accessories installed", done: false, dueDate: "2026-06-07" },
      { id: "m4", text: "Client walkthrough", done: false, dueDate: "2026-06-10" },
    ],
    activities: [
      {
        id: "a1",
        type: "complete",
        text: "Tiling phase signed off by Elena Popescu",
        timestamp: "2026-06-01T17:00:00Z",
      },
      {
        id: "a2",
        type: "note",
        text: "Minor snagging list submitted to client",
        timestamp: "2026-06-03T10:12:00Z",
      },
    ],
  },
  p3: {
    id: "p3",
    name: "Bucătărie Integrată Timișoara",
    clientId: "c3",
    clientName: "Radu Construct SRL",
    clientInitials: "RC",
    clientContactName: "Radu Ionescu",
    clientPhone: "+40 733 456 789",
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
    phases: [
      {
        id: "ph1",
        num: 1,
        name: "Design & Planning",
        startDate: "2026-05-20",
        endDate: "2026-06-05",
        completionPct: 80,
        state: "active",
      },
      {
        id: "ph2",
        num: 2,
        name: "Demolition",
        startDate: "2026-06-06",
        endDate: "2026-06-12",
        completionPct: 0,
        state: "upcoming",
      },
      {
        id: "ph3",
        num: 3,
        name: "Cabinetry & Plumbing",
        startDate: "2026-06-13",
        endDate: "2026-07-04",
        completionPct: 0,
        state: "upcoming",
      },
      {
        id: "ph4",
        num: 4,
        name: "Finishes",
        startDate: "2026-07-05",
        endDate: "2026-07-14",
        completionPct: 0,
        state: "upcoming",
      },
      {
        id: "ph5",
        num: 5,
        name: "Handover",
        startDate: "2026-07-17",
        endDate: "2026-07-17",
        completionPct: 0,
        state: "upcoming",
      },
    ],
    milestones: [
      { id: "m1", text: "Design mockup approved", done: true, dueDate: "2026-05-28" },
      { id: "m2", text: "Material quote finalised", done: false, dueDate: "2026-06-04" },
      { id: "m3", text: "Demolition permit", done: false, dueDate: "2026-06-05" },
    ],
    activities: [
      {
        id: "a1",
        type: "complete",
        text: "Design mockup approved by client",
        timestamp: "2026-05-28T14:00:00Z",
      },
      {
        id: "a2",
        type: "note",
        text: "Client requested quartz countertops — quote pending",
        timestamp: "2026-06-01T09:30:00Z",
      },
    ],
  },
  p4: {
    id: "p4",
    name: "Pardoseli Comerciale Brașov",
    clientId: "c1",
    clientName: "Andronic Group SRL",
    clientInitials: "AG",
    clientContactName: "Ion Andronic",
    clientPhone: "+40 744 123 456",
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
    phases: [
      {
        id: "ph1",
        num: 1,
        name: "Survey & Materials",
        startDate: "2026-05-01",
        endDate: "2026-05-06",
        completionPct: 100,
        state: "done",
      },
      {
        id: "ph2",
        num: 2,
        name: "Subfloor Prep",
        startDate: "2026-05-07",
        endDate: "2026-05-15",
        completionPct: 100,
        state: "done",
      },
      {
        id: "ph3",
        num: 3,
        name: "Floor Installation",
        startDate: "2026-05-16",
        endDate: "2026-06-10",
        completionPct: 91,
        state: "active",
      },
      {
        id: "ph4",
        num: 4,
        name: "Finishing & Handover",
        startDate: "2026-06-11",
        endDate: "2026-06-14",
        completionPct: 0,
        state: "upcoming",
      },
    ],
    milestones: [
      { id: "m1", text: "Subfloor levelled", done: true, dueDate: "2026-05-15" },
      { id: "m2", text: "Main area tiled", done: true, dueDate: "2026-05-30" },
      { id: "m3", text: "Skirting boards fitted", done: false, dueDate: "2026-06-10" },
      { id: "m4", text: "Client sign-off", done: false, dueDate: "2026-06-14" },
    ],
    activities: [
      {
        id: "a1",
        type: "flag",
        text: "Budget overrun flagged — unforeseen subfloor damage (+€2,200)",
        timestamp: "2026-05-22T08:45:00Z",
      },
      {
        id: "a2",
        type: "complete",
        text: "Main area installation completed",
        timestamp: "2026-05-30T17:30:00Z",
      },
      {
        id: "a3",
        type: "warning",
        text: "Grout delivery delayed by 2 days",
        timestamp: "2026-06-02T11:00:00Z",
      },
    ],
  },
}

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const project = MOCK_DETAIL[id]
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ project })
  }
)
