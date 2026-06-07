import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ShiftStatus = "confirmed" | "open" | "draft" | "scheduled"
export type ShiftRole = "foreman" | "bricklayer" | "electrician" | "finisher" | "welder" | "general"

export interface ShiftAssignee {
  id: string
  initials: string
  name: string
}

export interface ShiftSummary {
  id: string
  role: ShiftRole
  roleLabel: string
  title: string
  location: string
  site: string
  date: string
  dayLabel: string
  startTime: string
  endTime: string
  durationHours: number
  status: ShiftStatus
  assignees: ShiftAssignee[]
  openSlots: number
  project: string | null
}

export interface ShiftsMeta {
  total: number
  open: number
  coveragePct: number
  totalHours: number
  weekLabel: string
}

const MOCK_SHIFTS: ShiftSummary[] = [
  {
    id: "s1",
    role: "foreman",
    roleLabel: "Maistru Construcții",
    title: "Maistru Construcții",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "9 Iun 2026",
    dayLabel: "Miercuri 9 Iun",
    startTime: "07:00",
    endTime: "16:00",
    durationHours: 9,
    status: "confirmed",
    assignees: [
      { id: "e1", initials: "IC", name: "Ion Crișan" },
      { id: "e2", initials: "RD", name: "Radu Dima" },
      { id: "e3", initials: "SF", name: "Sorin Florea" },
    ],
    openSlots: 0,
    project: "A4 Brașov",
  },
  {
    id: "s2",
    role: "electrician",
    roleLabel: "Electrician",
    title: "Electrician",
    location: "Cluj Mănăștur",
    site: "Cluj Mănăștur",
    date: "9 Iun 2026",
    dayLabel: "Miercuri 9 Iun",
    startTime: "08:00",
    endTime: "17:00",
    durationHours: 9,
    status: "confirmed",
    assignees: [{ id: "e5", initials: "LT", name: "Liviu Toma" }],
    openSlots: 0,
    project: "Cluj Mănăștur",
  },
  {
    id: "s3",
    role: "finisher",
    roleLabel: "Echipă Finisaj",
    title: "Echipă Finisaj",
    location: "Cluj Mănăștur",
    site: "Cluj Mănăștur",
    date: "9 Iun 2026",
    dayLabel: "Miercuri 9 Iun",
    startTime: "09:00",
    endTime: "18:00",
    durationHours: 9,
    status: "draft",
    assignees: [
      { id: "e4", initials: "EM", name: "Elena Marin" },
      { id: "e6", initials: "AS", name: "Ana Stoica" },
    ],
    openSlots: 2,
    project: "Cluj Mănăștur",
  },
  {
    id: "s4",
    role: "welder",
    roleLabel: "Sudor · Structuri Metal",
    title: "Sudor · Structuri Metal",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "10 Iun 2026",
    dayLabel: "Joi 10 Iun",
    startTime: "06:30",
    endTime: "15:00",
    durationHours: 8.5,
    status: "scheduled",
    assignees: [{ id: "e2", initials: "RD", name: "Radu Dima" }],
    openSlots: 0,
    project: "A4 Brașov",
  },
  {
    id: "s5",
    role: "bricklayer",
    roleLabel: "Zidar",
    title: "Zidar",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "12 Iun 2026",
    dayLabel: "Sâmbătă 12 Iun",
    startTime: "08:00",
    endTime: "17:00",
    durationHours: 9,
    status: "open",
    assignees: [],
    openSlots: 1,
    project: "A4 Brașov",
  },
  {
    id: "s6",
    role: "electrician",
    roleLabel: "Electrician",
    title: "Electrician",
    location: "Cluj Mănăștur",
    site: "Cluj Mănăștur",
    date: "7 Iun 2026",
    dayLabel: "Luni 7 Iun",
    startTime: "07:00",
    endTime: "15:00",
    durationHours: 8,
    status: "open",
    assignees: [],
    openSlots: 1,
    project: "Cluj Mănăștur",
  },
  {
    id: "s7",
    role: "foreman",
    roleLabel: "Maistru Construcții",
    title: "Maistru Construcții",
    location: "Șantier A4 Brașov",
    site: "A4 Brașov",
    date: "11 Iun 2026",
    dayLabel: "Vineri 11 Iun",
    startTime: "07:00",
    endTime: "16:00",
    durationHours: 9,
    status: "confirmed",
    assignees: [
      { id: "e1", initials: "IC", name: "Ion Crișan" },
      { id: "e3", initials: "SF", name: "Sorin Florea" },
    ],
    openSlots: 0,
    project: "A4 Brașov",
  },
  {
    id: "s8",
    role: "general",
    roleLabel: "Muncitor General",
    title: "Muncitor General",
    location: "Depozit Central",
    site: "Depozit Cluj",
    date: "10 Iun 2026",
    dayLabel: "Joi 10 Iun",
    startTime: "08:00",
    endTime: "16:00",
    durationHours: 8,
    status: "confirmed",
    assignees: [{ id: "e7", initials: "VB", name: "Vasile Bota" }],
    openSlots: 0,
    project: null,
  },
]

function computeMeta(shifts: ShiftSummary[]): ShiftsMeta {
  const open = shifts.filter((s) => s.status === "open").length
  const covered = shifts.filter((s) => s.openSlots === 0).length
  const coveragePct = Math.round((covered / shifts.length) * 100)
  const totalHours = shifts.reduce((sum, s) => sum + s.durationHours * s.assignees.length, 0)
  return {
    total: shifts.length,
    open,
    coveragePct,
    totalHours,
    weekLabel: "7–13 Iun",
  }
}

export const GET = withGates(
  { action: "schedule.read", endpointClass: "api_read" },
  async (req: NextRequest, _ctx: GateContext): Promise<NextResponse> => {
    const status = req.nextUrl.searchParams.get("status")
    const results = status ? MOCK_SHIFTS.filter((s) => s.status === status) : MOCK_SHIFTS
    const meta = computeMeta(MOCK_SHIFTS)
    return NextResponse.json({ shifts: results, count: results.length, meta })
  }
)
